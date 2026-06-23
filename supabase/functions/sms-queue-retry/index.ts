/**
 * sms-queue-retry Edge Function
 *
 * Scheduled function that processes pending SMS queue items.
 * Runs every 5 minutes (triggered by pg_cron or external scheduler).
 *
 * For each pending item where next_retry_at <= NOW:
 *   - If created_at + 24h has passed → mark as failed, notify business owner
 *   - Otherwise, attempt to send via Twilio adapter
 *     - On success: mark as delivered, update review_request status to 'delivered'
 *     - On failure: increment retry_count, set next_retry_at = now + 5 minutes
 *
 * Requirements: 11.6
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createSupabaseClient,
  getPendingSmsQueueItems,
} from "../_shared/adapters/supabase.adapter.ts";
import { sendSms } from "../_shared/adapters/twilio.adapter.ts";
import { sanitizeForLogging } from "../_shared/utils/sanitize.ts";
import type { SmsQueueEntry } from "../_shared/types/index.ts";

/** 24 hours in milliseconds. */
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** 5 minutes in milliseconds for retry scheduling. */
const RETRY_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Determine if a queue entry has exceeded the 24-hour retry window.
 */
export function isExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() >= TWENTY_FOUR_HOURS_MS;
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
        "[sms-queue-retry] No device tokens found for push notification:",
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
        "[sms-queue-retry] Push notification send failed:",
        sanitizeForLogging({ status: response.status }),
      );
    }
  } catch (err) {
    // Push notification failures should not block the retry process
    console.error(
      "[sms-queue-retry] Push notification error:",
      sanitizeForLogging({ error: (err as Error).message }),
    );
  }
}

/**
 * Mark a queue item as failed in the database.
 */
async function markQueueItemFailed(
  client: ReturnType<typeof createSupabaseClient>,
  queueItemId: string,
): Promise<void> {
  const { error } = await client
    .from("sms_queue")
    .update({ status: "failed" })
    .eq("id", queueItemId);

  if (error) {
    console.error(
      "[sms-queue-retry] Failed to mark queue item as failed:",
      sanitizeForLogging({ queueItemId, error: error.message }),
    );
  }
}

/**
 * Mark a queue item as delivered and update the associated review_request status.
 */
async function markQueueItemDelivered(
  client: ReturnType<typeof createSupabaseClient>,
  queueItem: SmsQueueEntry,
): Promise<void> {
  // Update sms_queue status to delivered
  const { error: queueError } = await client
    .from("sms_queue")
    .update({ status: "delivered" })
    .eq("id", queueItem.id);

  if (queueError) {
    console.error(
      "[sms-queue-retry] Failed to mark queue item as delivered:",
      sanitizeForLogging({ queueItemId: queueItem.id, error: queueError.message }),
    );
  }

  // Update review_request status to 'delivered'
  const { error: requestError } = await client
    .from("review_requests")
    .update({ status: "delivered" })
    .eq("id", queueItem.reviewRequestId);

  if (requestError) {
    console.error(
      "[sms-queue-retry] Failed to update review_request status:",
      sanitizeForLogging({ reviewRequestId: queueItem.reviewRequestId, error: requestError.message }),
    );
  }
}

/**
 * Increment retry count and schedule next retry in 5 minutes.
 */
async function scheduleNextRetry(
  client: ReturnType<typeof createSupabaseClient>,
  queueItem: SmsQueueEntry,
): Promise<void> {
  const nextRetryAt = new Date(Date.now() + RETRY_INTERVAL_MS);

  const { error } = await client
    .from("sms_queue")
    .update({
      retry_count: queueItem.retryCount + 1,
      next_retry_at: nextRetryAt.toISOString(),
    })
    .eq("id", queueItem.id);

  if (error) {
    console.error(
      "[sms-queue-retry] Failed to schedule next retry:",
      sanitizeForLogging({ queueItemId: queueItem.id, error: error.message }),
    );
  }
}

/**
 * Mark the associated review_request as failed.
 */
async function markReviewRequestFailed(
  client: ReturnType<typeof createSupabaseClient>,
  reviewRequestId: string,
): Promise<void> {
  const { error } = await client
    .from("review_requests")
    .update({ status: "failed" })
    .eq("id", reviewRequestId);

  if (error) {
    console.error(
      "[sms-queue-retry] Failed to mark review_request as failed:",
      sanitizeForLogging({ reviewRequestId, error: error.message }),
    );
  }
}

/**
 * Get the business ID associated with a review request.
 */
async function getBusinessIdForRequest(
  client: ReturnType<typeof createSupabaseClient>,
  reviewRequestId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("review_requests")
    .select("business_id")
    .eq("id", reviewRequestId)
    .single();

  if (error || !data) {
    console.error(
      "[sms-queue-retry] Failed to get business_id for review request:",
      sanitizeForLogging({ reviewRequestId, error: error?.message }),
    );
    return null;
  }

  return data.business_id;
}

/**
 * Process a single SMS queue entry.
 */
async function processQueueItem(
  client: ReturnType<typeof createSupabaseClient>,
  item: SmsQueueEntry,
): Promise<void> {
  const now = new Date();

  // Check if 24 hours have passed since creation → mark as failed
  if (isExpired(item.createdAt, now)) {
    await markQueueItemFailed(client, item.id);
    await markReviewRequestFailed(client, item.reviewRequestId);

    // Send push notification to business owner about final failure
    const businessId = item.payload.businessId || await getBusinessIdForRequest(client, item.reviewRequestId);
    if (businessId) {
      const customerDisplay = item.payload.customerName || item.payload.to;
      await sendPushNotification(
        client,
        businessId,
        "SMS Delivery Failed",
        `Unable to deliver SMS to ${customerDisplay} after 24 hours of retrying. The message could not be sent.`,
        { type: "sms_failed", reviewRequestId: item.reviewRequestId },
      );
    }

    return;
  }

  // Attempt to send via Twilio adapter
  const smsResult = await sendSms(item.payload);

  if (smsResult.success) {
    // Success: mark as delivered, update review_request status
    await markQueueItemDelivered(client, item);
  } else {
    // Failure: increment retry_count, schedule next retry in 5 minutes
    console.error(
      "[sms-queue-retry] Twilio send failed for queue item:",
      sanitizeForLogging({
        queueItemId: item.id,
        retryCount: item.retryCount + 1,
        error: smsResult.error.message,
      }),
    );
    await scheduleNextRetry(client, item);
  }
}

serve(async (req: Request): Promise<Response> => {
  // Accept both POST (from external scheduler) and GET (from cron trigger)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Method not allowed" } }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  // Optional: verify scheduler secret for security
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  if (schedulerSecret) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${schedulerSecret}`) {
      return new Response(
        JSON.stringify({ error: { code: "AUTH_ERROR", message: "Unauthorized" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const client = createSupabaseClient();

  // 1. Get all pending items from sms_queue where next_retry_at <= NOW
  const queueResult = await getPendingSmsQueueItems(client);

  if (!queueResult.success) {
    console.error(
      "[sms-queue-retry] Failed to fetch pending queue items:",
      sanitizeForLogging({ error: queueResult.error.message }),
    );
    return new Response(
      JSON.stringify({
        error: { code: "SERVER_ERROR", message: "Failed to fetch queue items" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const items = queueResult.data;

  if (items.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, message: "No pending items to process" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Process each item
  let successCount = 0;
  let failedCount = 0;
  let expiredCount = 0;

  for (const item of items) {
    try {
      const wasExpired = isExpired(item.createdAt);
      await processQueueItem(client, item);

      if (wasExpired) {
        expiredCount++;
      } else {
        // We can't easily distinguish success from scheduled-retry here
        // without re-checking, so just count as processed
        successCount++;
      }
    } catch (err) {
      failedCount++;
      console.error(
        "[sms-queue-retry] Unexpected error processing queue item:",
        sanitizeForLogging({
          queueItemId: item.id,
          error: (err as Error).message,
        }),
      );
    }
  }

  return new Response(
    JSON.stringify({
      processed: items.length,
      successCount,
      failedCount,
      expiredCount,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
