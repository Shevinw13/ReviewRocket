/**
 * expire-conversations Edge Function
 *
 * Scheduled function that finds review requests older than 72 hours that
 * are still in an active state (sent, delivered, rating_received) and marks
 * them as expired. Creates an activity feed entry so the business owner
 * knows the customer didn't respond.
 *
 * Run via pg_cron or external scheduler (e.g., every hour).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createSupabaseClient,
  createActivityFeedEntry,
} from "../_shared/adapters/supabase.adapter.ts";
import { decrypt } from "../_shared/utils/encryption.ts";
import { sanitizeForLogging } from "../_shared/utils/sanitize.ts";

/** 72 hours in milliseconds. */
const CONVERSATION_EXPIRY_MS = 72 * 60 * 60 * 1000;

serve(async (req: Request): Promise<Response> => {
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
  const expiryThreshold = new Date(Date.now() - CONVERSATION_EXPIRY_MS).toISOString();

  // Find all review requests that are still in active states but older than 72 hours
  const { data: expiredRequests, error: fetchError } = await client
    .from("review_requests")
    .select("id, business_id, customer_name_encrypted, sent_at")
    .in("status", ["sent", "delivered", "rating_received"])
    .lt("sent_at", expiryThreshold)
    .limit(100);

  if (fetchError) {
    console.error(
      "[expire-conversations] Failed to fetch expired requests:",
      sanitizeForLogging({ error: fetchError.message }),
    );
    return new Response(
      JSON.stringify({ error: { code: "SERVER_ERROR", message: "Failed to fetch expired requests" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!expiredRequests || expiredRequests.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, message: "No expired conversations found" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  let processedCount = 0;

  for (const request of expiredRequests) {
    // Mark as expired
    const { error: updateError } = await client
      .from("review_requests")
      .update({ status: "expired" })
      .eq("id", request.id);

    if (updateError) {
      console.error(
        "[expire-conversations] Failed to expire request:",
        sanitizeForLogging({ requestId: request.id, error: updateError.message }),
      );
      continue;
    }

    // Decrypt customer name for the activity feed
    let customerName: string | undefined;
    if (request.customer_name_encrypted) {
      try {
        customerName = await decrypt(request.customer_name_encrypted);
      } catch {
        customerName = undefined;
      }
    }

    // Create activity feed entry so the business owner sees "No Response"
    await createActivityFeedEntry(client, {
      businessId: request.business_id,
      type: "rating",
      customerName,
      description: `${customerName || "A customer"} did not respond within 72 hours`,
      metadata: {
        reviewRequestId: request.id,
        expired: true,
      },
    });

    processedCount++;
  }

  return new Response(
    JSON.stringify({ processed: processedCount }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
