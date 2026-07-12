/**
 * twilio-webhook Edge Function
 *
 * Handles inbound SMS replies from customers via Twilio webhooks.
 * Processes the conversation flow: rating → positive/negative routing → feedback text.
 * Also handles opt-out (STOP) and opt-in (START) notifications from Twilio.
 * Returns TwiML XML responses to Twilio for immediate reply delivery.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 10.4, 1.1, 1.2, 1.3, 1.4, 5.1, 5.3
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createSupabaseClient,
  getActiveConversation,
  updateReviewRequestWithRating,
  createFeedbackRecord,
  updateFeedbackText,
  incrementInvalidResponseCount,
  markConversationEnded,
  writeAuditLog,
  createOptOutRecord,
  deactivateOptOutRecord,
  createInboxItem,
  createActivityFeedEntry,
} from "../_shared/adapters/supabase.adapter.ts";
import {
  buildPositiveResponse,
  buildNegativeResponse,
  buildThankYouResponse,
  buildRetryPromptResponse,
  buildConversationEndedResponse,
  buildEmptyResponse,
  buildHelpResponse,
} from "../_shared/adapters/twilio.adapter.ts";
import { hashPhone } from "../_shared/utils/hash.ts";
import { encrypt, decrypt } from "../_shared/utils/encryption.ts";
import { sanitizeForLogging } from "../_shared/utils/sanitize.ts";
import {
  formatOptOutInboxBody,
  formatOptOutActivityDescription,
  formatOptInActivityDescription,
} from "../_shared/utils/opt-out-format.ts";

/** Maximum hours after which a conversation expires. */
const CONVERSATION_EXPIRY_HOURS = 72;

/** Maximum consecutive invalid responses before ending conversation. */
const MAX_INVALID_RESPONSES = 2;

/** Maximum characters to store from feedback text. */
const MAX_FEEDBACK_TEXT_LENGTH = 500;

/** Keywords that indicate an opt-out request (case-insensitive). */
const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel"];

/** Keywords that indicate an opt-in request (case-insensitive). */
const OPT_IN_KEYWORDS = ["start", "unstop"];

/**
 * Detect if the incoming message is an opt-out notification.
 * Checks Twilio's OptOutType field or Body content for STOP keywords.
 */
export function isOptOut(optOutType: string, body: string): boolean {
  if (optOutType.toUpperCase() === "STOP") {
    return true;
  }
  const normalizedBody = body.trim().toLowerCase();
  return OPT_OUT_KEYWORDS.includes(normalizedBody);
}

/**
 * Detect if the incoming message is an opt-in notification.
 * Checks Twilio's OptOutType field or Body content for START keywords.
 */
export function isOptIn(optOutType: string, body: string): boolean {
  if (optOutType.toUpperCase() === "START") {
    return true;
  }
  const normalizedBody = body.trim().toLowerCase();
  return OPT_IN_KEYWORDS.includes(normalizedBody);
}

/**
 * Look up the business ID and customer name from review_requests by phone hash.
 * Returns the most recent review request's business_id and customer_name_encrypted.
 */
async function lookupBusinessByPhoneHash(
  client: ReturnType<typeof createSupabaseClient>,
  phoneHash: string,
): Promise<{ businessId: string; customerNameEncrypted?: string } | null> {
  const { data, error } = await client
    .from("review_requests")
    .select("business_id, customer_name_encrypted")
    .eq("customer_phone_hash", phoneHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    businessId: data.business_id,
    customerNameEncrypted: data.customer_name_encrypted || undefined,
  };
}

/**
 * Parse a rating from the SMS body.
 * Returns the numeric rating (1-5) if the body is exactly "1", "2", "3", "4", or "5".
/**
 * Parse a customer's SMS reply into a 1-5 integer rating.
 * Accepts whole numbers (1-5) and decimals (e.g. 4.5 rounds up to 5, 4.4 rounds down to 4).
 * Returns null for any non-numeric or out-of-range input.
 */
export function parseRating(body: string): number | null {
  const trimmed = body.trim();

  // Exact integers 1-5
  if (/^[1-5]$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Decimal numbers — round normally (.5+ rounds up, below .5 rounds down), clamp to 1-5
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num >= 1 && num <= 5) {
    return Math.max(1, Math.min(Math.round(num), 5));
  }

  return null;
}

/**
 * Check if a conversation has expired (>72 hours since sent_at).
 */
export function isExpired(sentAt: Date, now: Date = new Date()): boolean {
  const expiryMs = CONVERSATION_EXPIRY_HOURS * 60 * 60 * 1000;
  return now.getTime() - sentAt.getTime() > expiryMs;
}

/**
 * Send a push notification to the business owner's registered devices.
 * Uses the Expo Push Notification service.
 */
async function sendPushNotification(
  client: ReturnType<typeof createSupabaseClient>,
  businessId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    // Get device tokens for the business owner
    const { data: tokens, error } = await client
      .from("device_tokens")
      .select("token")
      .eq("business_id", businessId);

    if (error || !tokens || tokens.length === 0) {
      console.error(
        "[twilio-webhook] No device tokens found for push notification:",
        sanitizeForLogging({ businessId, error: error?.message }),
      );
      return;
    }

    // Send via Expo Push Notification API
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: data || {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error(
        "[twilio-webhook] Push notification send failed:",
        sanitizeForLogging({ status: response.status }),
      );
    }
  } catch (err) {
    // Push notification failures should not block the webhook response
    console.error(
      "[twilio-webhook] Push notification error:",
      sanitizeForLogging({ error: (err as Error).message }),
    );
  }
}

/**
 * Return a TwiML XML response with appropriate Content-Type header.
 */
function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

serve(async (req: Request): Promise<Response> => {
  // Only accept POST requests (Twilio webhooks are always POST)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Parse Twilio webhook payload (application/x-www-form-urlencoded)
  let from: string;
  let body: string;
  let optOutType: string;

  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    from = params.get("From") || "";
    body = params.get("Body") || "";
    optOutType = params.get("OptOutType") || "";
  } catch {
    console.error("[twilio-webhook] Failed to parse webhook payload");
    return twimlResponse(buildEmptyResponse());
  }

  // 2. Check for opt-out or opt-in or HELP before other processing
  if (isOptOut(optOutType, body)) {
    return await handleOptOut(from);
  }

  if (isOptIn(optOutType, body)) {
    return await handleOptIn(from);
  }

  // Handle HELP keyword
  if (body.trim().toLowerCase() === 'help') {
    return twimlResponse(buildHelpResponse());
  }

  if (!from || !body) {
    return twimlResponse(buildEmptyResponse());
  }

  // 2. Hash the incoming phone number for lookup
  const serviceClient = createSupabaseClient();
  let phoneHash: string;

  try {
    phoneHash = await hashPhone(from);
  } catch (err) {
    console.error(
      "[twilio-webhook] Failed to hash phone:",
      sanitizeForLogging({ error: (err as Error).message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // 3. Look up active conversation by customer phone hash
  const conversationResult = await getActiveConversation(serviceClient, phoneHash);

  if (!conversationResult.success) {
    console.error(
      "[twilio-webhook] Failed to get active conversation:",
      sanitizeForLogging({ error: conversationResult.error.message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  const conversation = conversationResult.data;

  // No active conversation found
  if (!conversation) {
    return twimlResponse(buildEmptyResponse());
  }

  // 4. Check 72-hour expiry
  if (isExpired(conversation.createdAt)) {
    return twimlResponse(buildEmptyResponse());
  }

  // 5. Handle based on conversation state
  if (conversation.state === "awaiting_rating") {
    return await handleAwaitingRating(serviceClient, conversation, body);
  }

  if (conversation.state === "awaiting_feedback_text") {
    return await handleAwaitingFeedbackText(serviceClient, conversation, body);
  }

  // Unknown state — return empty
  return twimlResponse(buildEmptyResponse());
});

/**
 * Handle an inbound SMS when the conversation is awaiting a rating (1-5).
 */
async function handleAwaitingRating(
  client: ReturnType<typeof createSupabaseClient>,
  conversation: NonNullable<Awaited<ReturnType<typeof getActiveConversation>> extends { data: infer D } ? D : never>,
  body: string,
): Promise<Response> {
  const rating = parseRating(body);

  if (rating !== null) {
    // Valid rating received
    // Update review request with rating (Requirement 4.9)
    const updateResult = await updateReviewRequestWithRating(
      client,
      conversation.reviewRequestId,
      rating,
    );

    if (!updateResult.success) {
      console.error(
        "[twilio-webhook] Failed to update rating:",
        sanitizeForLogging({ error: updateResult.error.message }),
      );
      return twimlResponse(buildEmptyResponse());
    }

    // Create feedback record
    const feedbackResult = await createFeedbackRecord(client, {
      reviewRequestId: conversation.reviewRequestId,
      businessId: conversation.businessId,
      rating,
    });

    if (!feedbackResult.success) {
      console.error(
        "[twilio-webhook] Failed to create feedback record:",
        sanitizeForLogging({ error: feedbackResult.error.message }),
      );
    }

    // Write audit log entry for feedback_received (Requirement 10.4)
    await writeAuditLog(client, {
      actorId: conversation.businessId,
      eventType: "feedback_received",
      resourceId: conversation.reviewRequestId,
      metadata: {
        rating,
        businessId: conversation.businessId,
      },
    });

    if (rating >= 4) {
      // Positive rating (4-5): respond with Google Review URL (Requirement 4.3)
      // If no Google Review URL configured, send a simple thank you
      if (conversation.googleReviewUrl) {
        return twimlResponse(buildPositiveResponse(conversation.googleReviewUrl));
      } else {
        return twimlResponse(buildThankYouResponse());
      }
    } else {
      // Negative rating (1-3): respond with feedback prompt (Requirement 4.4)
      // Trigger push notification to business owner (Requirement 7.1)
      const customerDisplay = conversation.customerName || "A customer";
      await sendPushNotification(
        client,
        conversation.businessId,
        "New Feedback Rating",
        `${customerDisplay} rated their experience ${rating}/5`,
        {
          type: "negative_rating",
          reviewRequestId: conversation.reviewRequestId,
          rating,
        },
      );

      return twimlResponse(buildNegativeResponse());
    }
  } else {
    // Invalid response (not a number 1-5) (Requirement 4.7)
    return await handleInvalidResponse(client, conversation);
  }
}

/**
 * Handle an invalid response: increment count and send retry or end conversation.
 */
async function handleInvalidResponse(
  client: ReturnType<typeof createSupabaseClient>,
  conversation: NonNullable<Awaited<ReturnType<typeof getActiveConversation>> extends { data: infer D } ? D : never>,
): Promise<Response> {
  const currentCount = conversation.invalidResponseCount;

  if (currentCount + 1 >= MAX_INVALID_RESPONSES) {
    // 2 consecutive invalid responses: end conversation (Requirement 4.8)
    await incrementInvalidResponseCount(client, conversation.reviewRequestId);
    await markConversationEnded(client, conversation.reviewRequestId);
    return twimlResponse(buildConversationEndedResponse());
  } else {
    // Increment invalid count and send retry prompt (Requirement 4.7)
    await incrementInvalidResponseCount(client, conversation.reviewRequestId);
    return twimlResponse(buildRetryPromptResponse());
  }
}

/**
 * Handle an inbound SMS when the conversation is awaiting written feedback text.
 */
async function handleAwaitingFeedbackText(
  client: ReturnType<typeof createSupabaseClient>,
  conversation: NonNullable<Awaited<ReturnType<typeof getActiveConversation>> extends { data: infer D } ? D : never>,
  body: string,
): Promise<Response> {
  // Store first 500 characters of feedback text (Requirements 4.5, 4.6)
  const truncatedText = body.substring(0, MAX_FEEDBACK_TEXT_LENGTH);

  // Encrypt feedback text before storage (Requirement 10.1)
  let encryptedText: string;
  try {
    encryptedText = await encrypt(truncatedText);
  } catch (err) {
    console.error(
      "[twilio-webhook] Failed to encrypt feedback text:",
      sanitizeForLogging({ error: (err as Error).message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // Update feedback record with text
  const updateResult = await updateFeedbackText(
    client,
    conversation.reviewRequestId,
    encryptedText,
  );

  if (!updateResult.success) {
    console.error(
      "[twilio-webhook] Failed to update feedback text:",
      sanitizeForLogging({ error: updateResult.error.message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // Write audit log entry for feedback_received with text (Requirement 10.4)
  await writeAuditLog(client, {
    actorId: conversation.businessId,
    eventType: "feedback_received",
    resourceId: conversation.reviewRequestId,
    metadata: {
      businessId: conversation.businessId,
      hasFeedbackText: true,
    },
  });

  // Create inbox item so the business owner sees the feedback in their inbox
  const customerDisplay = conversation.customerName || "A customer";
  const inboxResult = await createInboxItem(client, {
    businessId: conversation.businessId,
    type: "feedback_received",
    title: "New Customer Feedback",
    body: `${customerDisplay} shared written feedback about their experience. Scroll down to review and respond.`,
    metadata: {
      reviewRequestId: conversation.reviewRequestId,
      rating: undefined, // rating is on the feedback_record, not available here directly
    },
  });

  if (!inboxResult.success) {
    console.error(
      "[twilio-webhook] Failed to create feedback inbox item:",
      sanitizeForLogging({ error: inboxResult.error.message }),
    );
    // Non-fatal: feedback is stored regardless
  }

  // Send push notification for written feedback (Requirement 7.2)
  await sendPushNotification(
    client,
    conversation.businessId,
    "New Written Feedback",
    `${customerDisplay} shared written feedback about their experience`,
    {
      type: "feedback_text",
      reviewRequestId: conversation.reviewRequestId,
    },
  );

  // Send thank you response (Requirement 4.5)
  return twimlResponse(buildThankYouResponse());
}

/**
 * Handle an opt-out notification (customer texted STOP/UNSUBSCRIBE/CANCEL).
 * Creates opt-out record, inbox item, and activity feed entry.
 * Returns empty TwiML (Twilio handles the STOP confirmation at carrier level).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2
 */
async function handleOptOut(from: string): Promise<Response> {
  // Validate required field
  if (!from) {
    console.error("[twilio-webhook] Opt-out received with missing From field");
    return twimlResponse(buildEmptyResponse());
  }

  const serviceClient = createSupabaseClient();

  // 1. Compute phone hash
  let phoneHash: string;
  try {
    phoneHash = await hashPhone(from);
  } catch (err) {
    console.error(
      "[twilio-webhook] Failed to hash phone for opt-out:",
      sanitizeForLogging({ error: (err as Error).message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // 2. Look up business via existing review request matching logic
  const lookup = await lookupBusinessByPhoneHash(serviceClient, phoneHash);
  if (!lookup) {
    // No known business for this phone — cannot create opt-out record
    console.error(
      "[twilio-webhook] Opt-out from unknown phone, no matching review request found",
    );
    return twimlResponse(buildEmptyResponse());
  }

  const { businessId, customerNameEncrypted } = lookup;

  // 3. Decrypt customer name for display purposes (if available)
  let customerName: string | undefined;
  if (customerNameEncrypted) {
    try {
      customerName = await decrypt(customerNameEncrypted);
    } catch {
      // Fall back to phone display if decryption fails
      customerName = undefined;
    }
  }

  // 4. Create opt-out record (idempotent — ON CONFLICT DO NOTHING)
  const optOutResult = await createOptOutRecord(serviceClient, {
    businessId,
    customerPhoneHash: phoneHash,
    customerNameEncrypted: customerNameEncrypted,
  });

  if (!optOutResult.success) {
    console.error(
      "[twilio-webhook] Failed to create opt-out record:",
      sanitizeForLogging({ error: optOutResult.error.message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // 5. Create inbox item for business owner
  const inboxBody = formatOptOutInboxBody(customerName, from);
  const inboxResult = await createInboxItem(serviceClient, {
    businessId,
    type: "opt_out",
    title: "Customer Opted Out",
    body: inboxBody,
  });

  if (!inboxResult.success) {
    console.error(
      "[twilio-webhook] Failed to create opt-out inbox item:",
      sanitizeForLogging({ error: inboxResult.error.message }),
    );
    // Non-fatal: opt-out record is the source of truth
  }

  // 6. Create activity feed entry
  const activityDescription = formatOptOutActivityDescription(customerName, from);
  const activityResult = await createActivityFeedEntry(serviceClient, {
    businessId,
    type: "sms_opt_out",
    customerName,
    customerPhoneFormatted: from,
    description: activityDescription,
  });

  if (!activityResult.success) {
    console.error(
      "[twilio-webhook] Failed to create opt-out activity entry:",
      sanitizeForLogging({ error: activityResult.error.message }),
    );
    // Non-fatal: opt-out record is the source of truth
  }

  // 7. Return empty TwiML (Twilio already sends carrier-level STOP confirmation)
  return twimlResponse(buildEmptyResponse());
}

/**
 * Handle an opt-in notification (customer texted START/UNSTOP).
 * Deactivates the opt-out record and creates an activity feed entry.
 * If no existing opt-out record found, this is a no-op.
 *
 * Requirements: 5.1, 5.3
 */
async function handleOptIn(from: string): Promise<Response> {
  // Validate required field
  if (!from) {
    console.error("[twilio-webhook] Opt-in received with missing From field");
    return twimlResponse(buildEmptyResponse());
  }

  const serviceClient = createSupabaseClient();

  // 1. Compute phone hash
  let phoneHash: string;
  try {
    phoneHash = await hashPhone(from);
  } catch (err) {
    console.error(
      "[twilio-webhook] Failed to hash phone for opt-in:",
      sanitizeForLogging({ error: (err as Error).message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // 2. Look up business via existing review request matching logic
  const lookup = await lookupBusinessByPhoneHash(serviceClient, phoneHash);
  if (!lookup) {
    // No known business for this phone — no-op
    return twimlResponse(buildEmptyResponse());
  }

  const { businessId, customerNameEncrypted } = lookup;

  // 3. Decrypt customer name for display purposes (if available)
  let customerName: string | undefined;
  if (customerNameEncrypted) {
    try {
      customerName = await decrypt(customerNameEncrypted);
    } catch {
      customerName = undefined;
    }
  }

  // 4. Deactivate opt-out record (if no active record exists, this is a no-op)
  const deactivateResult = await deactivateOptOutRecord(serviceClient, {
    businessId,
    customerPhoneHash: phoneHash,
  });

  if (!deactivateResult.success) {
    console.error(
      "[twilio-webhook] Failed to deactivate opt-out record:",
      sanitizeForLogging({ error: deactivateResult.error.message }),
    );
    return twimlResponse(buildEmptyResponse());
  }

  // 5. Create activity feed entry for opt-in
  const activityDescription = formatOptInActivityDescription(customerName, from);
  const activityResult = await createActivityFeedEntry(serviceClient, {
    businessId,
    type: "sms_opt_in",
    customerName,
    customerPhoneFormatted: from,
    description: activityDescription,
  });

  if (!activityResult.success) {
    console.error(
      "[twilio-webhook] Failed to create opt-in activity entry:",
      sanitizeForLogging({ error: activityResult.error.message }),
    );
    // Non-fatal
  }

  // 6. Return empty TwiML
  return twimlResponse(buildEmptyResponse());
}
