/**
 * delete-customer Edge Function
 *
 * Handles GDPR-compliant deletion of customer data associated with a specific
 * review request. Clears encrypted PII fields (phone number, name, feedback text)
 * and logs the deletion event in the audit log.
 *
 * The data is cleared immediately upon request. The 30-day window referenced in
 * the requirements is for GDPR compliance documentation — this function processes
 * the deletion at invocation time.
 *
 * Requirements: 10.7
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createSupabaseClient,
  createSupabaseClientWithAuth,
  getBusinessProfile,
  writeAuditLog,
} from "../_shared/adapters/supabase.adapter.ts";
import { sanitizeForLogging } from "../_shared/utils/sanitize.ts";

/** Request body for the delete-customer function. */
interface DeleteCustomerRequest {
  /** The review_request ID whose customer data should be deleted. */
  reviewRequestId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Method not allowed" } }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  // 1. Verify the request is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: { code: "AUTH_ERROR", message: "Missing authorization header" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const userClient = createSupabaseClientWithAuth(authHeader);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: { code: "AUTH_ERROR", message: "Invalid or expired token" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Parse and validate request body
  let body: DeleteCustomerRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { reviewRequestId } = body;

  if (!reviewRequestId || typeof reviewRequestId !== "string") {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "reviewRequestId is required" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3. Verify the caller owns the business (same pattern as decrypt-data)
  const serviceClient = createSupabaseClient();
  const profileResult = await getBusinessProfile(serviceClient, user.id);

  if (!profileResult.success) {
    console.error(
      "[delete-customer] Failed to get business profile:",
      sanitizeForLogging({ userId: user.id, error: profileResult.error.message }),
    );
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Business profile not found" } }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const profile = profileResult.data;

  // 4. Fetch the review request and verify it belongs to the caller's business
  const { data: reviewRequest, error: rrError } = await serviceClient
    .from("review_requests")
    .select("id, business_id")
    .eq("id", reviewRequestId)
    .single();

  if (rrError || !reviewRequest) {
    console.error(
      "[delete-customer] Review request not found:",
      sanitizeForLogging({ userId: user.id, reviewRequestId }),
    );
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Review request not found" } }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  if (reviewRequest.business_id !== profile.id) {
    console.error(
      "[delete-customer] Authorization failed: review request does not belong to caller's business",
      sanitizeForLogging({
        userId: user.id,
        userBusinessId: profile.id,
        reviewRequestBusinessId: reviewRequest.business_id,
      }),
    );
    return new Response(
      JSON.stringify({ error: { code: "AUTH_ERROR", message: "Not authorized to delete this record" } }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // 5. Clear encrypted customer fields on the review_request
  const { error: updateRrError } = await serviceClient
    .from("review_requests")
    .update({
      customer_phone_encrypted: null,
      customer_name_encrypted: null,
    })
    .eq("id", reviewRequestId);

  if (updateRrError) {
    console.error(
      "[delete-customer] Failed to clear review_request fields:",
      sanitizeForLogging({ reviewRequestId, error: updateRrError.message }),
    );
    return new Response(
      JSON.stringify({ error: { code: "SERVER_ERROR", message: "Failed to delete customer data" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 6. Clear feedback_text_encrypted on associated feedback_records
  const { error: updateFbError } = await serviceClient
    .from("feedback_records")
    .update({
      feedback_text_encrypted: null,
    })
    .eq("review_request_id", reviewRequestId);

  if (updateFbError) {
    console.error(
      "[delete-customer] Failed to clear feedback_records fields:",
      sanitizeForLogging({ reviewRequestId, error: updateFbError.message }),
    );
    return new Response(
      JSON.stringify({ error: { code: "SERVER_ERROR", message: "Failed to delete feedback data" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 7. Write audit log entry for the deletion event
  await writeAuditLog(serviceClient, {
    actorId: user.id,
    eventType: "record_deleted",
    resourceId: reviewRequestId,
    metadata: {
      action: "customer_data_deleted",
      businessId: profile.id,
      deletedFields: [
        "customer_phone_encrypted",
        "customer_name_encrypted",
        "feedback_text_encrypted",
      ],
    },
  });

  // 8. Return success
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        reviewRequestId,
        deletedAt: new Date().toISOString(),
        message: "Customer data has been permanently deleted",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
