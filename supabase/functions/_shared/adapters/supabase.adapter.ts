/**
 * Supabase adapter for Edge Functions.
 * Provides a Supabase client and common database operations.
 * All Supabase-specific API calls are isolated to this module (Requirement 13.4).
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  AuditEventType,
  BusinessProfile,
  Result,
  FeedbackRecord,
  ActiveConversation,
  SmsQueueEntry,
  SendSmsPayload,
} from "../types/index.ts";
import { ErrorCode, TIER_QUOTAS } from "../types/index.ts";

/**
 * Creates and returns a Supabase client configured for Edge Function use.
 * Uses the service role key for server-side operations.
 */
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client using the user's JWT for RLS-scoped queries.
 */
export function createSupabaseClientWithAuth(
  authHeader: string,
): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get a business profile by business owner ID.
 */
export async function getBusinessProfile(
  client: SupabaseClient,
  authUserId: string,
): Promise<Result<BusinessProfile>> {
  const { data, error } = await client
    .from("business_owners")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error) {
    return {
      success: false,
      error: {
        code: error.code === "PGRST116" ? ErrorCode.NOT_FOUND : ErrorCode.SERVER_ERROR,
        message: error.message,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: mapBusinessProfile(data),
  };
}

/**
 * Get the active conversation for a customer phone number.
/**
 * Get the active conversation for a customer phone number.
 * Looks up the most recent review request using the deterministic phone hash.
 */
export async function getActiveConversation(
  client: SupabaseClient,
  customerPhoneHash: string,
): Promise<Result<ActiveConversation | null>> {
  const { data, error } = await client
    .from("review_requests")
    .select(`
      id,
      business_id,
      customer_phone_encrypted,
      customer_name_encrypted,
      status,
      sent_at,
      invalid_response_count,
      created_at,
      business_owners!inner(google_review_url)
    `)
    .eq("customer_phone_hash", customerPhoneHash)
    .in("status", ["sent", "delivered", "rating_received"])
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  if (!data) {
    return { success: true, data: null };
  }

  // Determine conversation state from review request status
  let state: ActiveConversation["state"] = "awaiting_rating";
  if (data.status === "rating_received") {
    state = "awaiting_feedback_text";
  }

  const conversation: ActiveConversation = {
    id: data.id,
    reviewRequestId: data.id,
    businessId: data.business_id,
    customerPhone: data.customer_phone_encrypted,
    customerName: data.customer_name_encrypted || undefined,
    googleReviewUrl: (data.business_owners as Record<string, string>).google_review_url,
    state,
    invalidResponseCount: data.invalid_response_count || 0,
    createdAt: new Date(data.sent_at),
  };

  return { success: true, data: conversation };
}

/**
 * Increment the invalid response count for a review request.
 */
export async function incrementInvalidResponseCount(
  client: SupabaseClient,
  reviewRequestId: string,
): Promise<Result<number>> {
  // Get current count and increment
  const { data, error: fetchError } = await client
    .from("review_requests")
    .select("invalid_response_count")
    .eq("id", reviewRequestId)
    .single();

  if (fetchError) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: fetchError.message },
    };
  }

  const newCount = (data.invalid_response_count || 0) + 1;
  const { error: updateError } = await client
    .from("review_requests")
    .update({ invalid_response_count: newCount })
    .eq("id", reviewRequestId);

  if (updateError) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: updateError.message },
    };
  }

  return { success: true, data: newCount };
}

/**
 * Mark a review request as expired (conversation ended).
 */
export async function markConversationEnded(
  client: SupabaseClient,
  reviewRequestId: string,
): Promise<Result<void>> {
  const { error } = await client
    .from("review_requests")
    .update({ status: "expired" })
    .eq("id", reviewRequestId);

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message },
    };
  }

  return { success: true, data: undefined };
}

/**
 * Update a review request with a rating.
 */
export async function updateReviewRequestWithRating(
  client: SupabaseClient,
  reviewRequestId: string,
  rating: number,
): Promise<Result<void>> {
  const status = rating >= 4 ? "rating_received" : "rating_received";
  const { error } = await client
    .from("review_requests")
    .update({
      rating,
      status,
      feedback_received_at: new Date().toISOString(),
    })
    .eq("id", reviewRequestId);

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  return { success: true, data: undefined };
}

/**
 * Create a feedback record.
 */
export async function createFeedbackRecord(
  client: SupabaseClient,
  params: {
    reviewRequestId: string;
    businessId: string;
    rating: number;
    feedbackText?: string;
  },
): Promise<Result<FeedbackRecord>> {
  const { data, error } = await client
    .from("feedback_records")
    .insert({
      review_request_id: params.reviewRequestId,
      business_id: params.businessId,
      rating: params.rating,
      feedback_text_encrypted: params.feedbackText || null,
      is_resolved: false,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  return {
    success: true,
    data: mapFeedbackRecord(data),
  };
}

/**
 * Update feedback text on an existing feedback record.
 */
export async function updateFeedbackText(
  client: SupabaseClient,
  reviewRequestId: string,
  text: string,
): Promise<Result<void>> {
  const { error } = await client
    .from("feedback_records")
    .update({ feedback_text_encrypted: text })
    .eq("review_request_id", reviewRequestId);

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  // Update the review request status to feedback_received
  await client
    .from("review_requests")
    .update({ status: "feedback_received" })
    .eq("id", reviewRequestId);

  return { success: true, data: undefined };
}

/**
 * Increment SMS usage counter for a business.
 */
export async function incrementSmsUsage(
  client: SupabaseClient,
  businessId: string,
): Promise<Result<number>> {
  const { data, error } = await client.rpc("increment_sms_usage", {
    p_business_id: businessId,
  });

  if (error) {
    // Fallback: do a manual increment if RPC doesn't exist
    const { data: profile, error: fetchError } = await client
      .from("business_owners")
      .select("sms_used_this_period")
      .eq("id", businessId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: fetchError.message },
      };
    }

    const newCount = (profile.sms_used_this_period || 0) + 1;
    const { error: updateError } = await client
      .from("business_owners")
      .update({ sms_used_this_period: newCount })
      .eq("id", businessId);

    if (updateError) {
      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: updateError.message },
      };
    }

    return { success: true, data: newCount };
  }

  return { success: true, data: data as number };
}

/**
 * Get SMS usage for a business.
 */
export async function getSmsUsage(
  client: SupabaseClient,
  businessId: string,
): Promise<Result<{ used: number; quota: number }>> {
  const { data, error } = await client
    .from("business_owners")
    .select("sms_used_this_period, subscription_tier")
    .eq("id", businessId)
    .single();

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  const tier = data.subscription_tier as keyof typeof TIER_QUOTAS;

  return {
    success: true,
    data: {
      used: data.sms_used_this_period || 0,
      quota: TIER_QUOTAS[tier] || 250,
    },
  };
}

/**
 * Write an entry to the audit log.
 */
export async function writeAuditLog(
  client: SupabaseClient,
  params: {
    actorId: string;
    eventType: AuditEventType;
    resourceId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Result<void>> {
  const { error } = await client.from("audit_log").insert({
    actor_id: params.actorId,
    event_type: params.eventType,
    resource_id: params.resourceId,
    metadata: params.metadata || null,
  });

  if (error) {
    // Audit log failures should not block the main operation
    console.error("[audit_log] Failed to write entry:", error.message);
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message },
    };
  }

  return { success: true, data: undefined };
}

/**
 * Queue an SMS for retry delivery.
 */
export async function queueSmsForRetry(
  client: SupabaseClient,
  params: {
    reviewRequestId: string;
    payload: SendSmsPayload;
  },
): Promise<Result<void>> {
  const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const { error } = await client.from("sms_queue").insert({
    review_request_id: params.reviewRequestId,
    payload: params.payload,
    retry_count: 0,
    status: "pending",
    next_retry_at: nextRetryAt.toISOString(),
  });

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  return { success: true, data: undefined };
}

/**
 * Get pending SMS queue items that are ready for retry.
 */
export async function getPendingSmsQueueItems(
  client: SupabaseClient,
): Promise<Result<SmsQueueEntry[]>> {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("sms_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", now)
    .order("next_retry_at", { ascending: true });

  if (error) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
    };
  }

  return {
    success: true,
    data: (data || []).map(mapSmsQueueEntry),
  };
}

// ─── Opt-Out / Inbox / Activity Feed ────────────────────────────────────────

/**
 * Create an opt-out record for a customer phone + business combination.
 * Uses ON CONFLICT DO NOTHING for idempotency.
 * Returns the record id and whether a new record was actually created.
 */
export async function createOptOutRecord(
  client: SupabaseClient,
  params: {
    businessId: string;
    customerPhoneHash: string;
    customerNameEncrypted?: string;
  },
): Promise<Result<{ id: string; created: boolean }>> {
  try {
    // Attempt insert; ON CONFLICT DO NOTHING is handled via upsert with ignoreDuplicates
    const { data, error } = await client
      .from("sms_opt_outs")
      .upsert(
        {
          business_id: params.businessId,
          customer_phone_hash: params.customerPhoneHash,
          customer_name_encrypted: params.customerNameEncrypted || null,
          is_active: true,
          opted_out_at: new Date().toISOString(),
        },
        { onConflict: "business_id,customer_phone_hash", ignoreDuplicates: true },
      )
      .select("id")
      .single();

    if (error) {
      // If ignoreDuplicates causes no row to be returned, look up the existing record
      if (error.code === "PGRST116") {
        const { data: existing, error: lookupError } = await client
          .from("sms_opt_outs")
          .select("id")
          .eq("business_id", params.businessId)
          .eq("customer_phone_hash", params.customerPhoneHash)
          .single();

        if (lookupError) {
          return {
            success: false,
            error: { code: ErrorCode.SERVER_ERROR, message: lookupError.message, details: lookupError },
          };
        }

        return { success: true, data: { id: existing.id, created: false } };
      }

      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
      };
    }

    return { success: true, data: { id: data.id, created: true } };
  } catch (err) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: (err as Error).message },
    };
  }
}

/**
 * Deactivate an opt-out record (customer opted back in).
 * Sets is_active = false and records the opted_in_at timestamp.
 */
export async function deactivateOptOutRecord(
  client: SupabaseClient,
  params: {
    businessId: string;
    customerPhoneHash: string;
  },
): Promise<Result<void>> {
  try {
    const { error } = await client
      .from("sms_opt_outs")
      .update({
        is_active: false,
        opted_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", params.businessId)
      .eq("customer_phone_hash", params.customerPhoneHash)
      .eq("is_active", true);

    if (error) {
      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
      };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: (err as Error).message },
    };
  }
}

/**
 * Check whether a customer phone is opted out for a given business.
 * Returns true if an active opt-out record exists, false otherwise.
 */
export async function checkOptOutStatus(
  client: SupabaseClient,
  phoneHash: string,
  businessId: string,
): Promise<Result<boolean>> {
  try {
    const { data, error } = await client
      .from("sms_opt_outs")
      .select("id")
      .eq("customer_phone_hash", phoneHash)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
      };
    }

    return { success: true, data: data !== null };
  } catch (err) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: (err as Error).message },
    };
  }
}

/**
 * Create an inbox item (e.g., opt-out notification for the business owner).
 */
export async function createInboxItem(
  client: SupabaseClient,
  params: {
    businessId: string;
    type: "opt_out" | "system";
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Result<{ id: string }>> {
  try {
    const { data, error } = await client
      .from("inbox_items")
      .insert({
        business_id: params.businessId,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata: params.metadata || null,
      })
      .select("id")
      .single();

    if (error) {
      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
      };
    }

    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: (err as Error).message },
    };
  }
}

/**
 * Create an activity feed entry (opt-out, opt-in, or rating event).
 */
export async function createActivityFeedEntry(
  client: SupabaseClient,
  params: {
    businessId: string;
    type: "rating" | "sms_opt_out" | "sms_opt_in";
    customerName?: string;
    customerPhoneFormatted?: string;
    description: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Result<{ id: string }>> {
  try {
    const { data, error } = await client
      .from("activity_feed")
      .insert({
        business_id: params.businessId,
        type: params.type,
        customer_name: params.customerName || null,
        customer_phone_formatted: params.customerPhoneFormatted || null,
        description: params.description,
        metadata: params.metadata || null,
      })
      .select("id")
      .single();

    if (error) {
      return {
        success: false,
        error: { code: ErrorCode.SERVER_ERROR, message: error.message, details: error },
      };
    }

    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: { code: ErrorCode.SERVER_ERROR, message: (err as Error).message },
    };
  }
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapBusinessProfile(row: Record<string, unknown>): BusinessProfile {
  return {
    id: row.id as string,
    authUserId: row.auth_user_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    businessName: row.business_name as string,
    email: row.email as string,
    googleReviewUrl: row.google_review_url as string,
    subscriptionTier: row.subscription_tier as BusinessProfile["subscriptionTier"],
    smsUsedThisPeriod: (row.sms_used_this_period as number) || 0,
    billingPeriodStart: new Date(row.billing_period_start as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapFeedbackRecord(row: Record<string, unknown>): FeedbackRecord {
  return {
    id: row.id as string,
    reviewRequestId: row.review_request_id as string,
    businessId: row.business_id as string,
    rating: row.rating as number,
    feedbackText: (row.feedback_text_encrypted as string) || undefined,
    isResolved: row.is_resolved as boolean,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
  };
}

function mapSmsQueueEntry(row: Record<string, unknown>): SmsQueueEntry {
  return {
    id: row.id as string,
    reviewRequestId: row.review_request_id as string,
    payload: row.payload as SendSmsPayload,
    retryCount: row.retry_count as number,
    status: row.status as SmsQueueEntry["status"],
    nextRetryAt: new Date(row.next_retry_at as string),
    createdAt: new Date(row.created_at as string),
  };
}
