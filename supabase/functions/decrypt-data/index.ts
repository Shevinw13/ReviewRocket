/**
 * decrypt-data Edge Function
 *
 * Provides authenticated decryption of sensitive customer fields
 * (phone number, customer name, feedback text) for authorized business owners.
 *
 * The mobile app stores encrypted values but needs plaintext for display.
 * This function ensures:
 * - Only authenticated users can request decryption
 * - The caller must own the business associated with the data (via RLS/auth check)
 * - The encryption key never leaves the server
 * - Customer PII is excluded from logs
 *
 * Requirements: 10.1, 10.6
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createSupabaseClient,
  createSupabaseClientWithAuth,
  getBusinessProfile,
} from "../_shared/adapters/supabase.adapter.ts";
import { decrypt } from "../_shared/utils/encryption.ts";
import { sanitizeForLogging } from "../_shared/utils/sanitize.ts";

/** Shape of a single field to decrypt. */
interface DecryptFieldRequest {
  /** The encrypted base64 string to decrypt. */
  ciphertext: string;
  /** Identifier for the field type (for validation and logging). */
  fieldType: "customer_phone" | "customer_name" | "feedback_text";
}

/** Request body for the decrypt-data function. */
interface DecryptDataRequest {
  /** The business_id that owns the encrypted data. */
  businessId: string;
  /** Array of fields to decrypt. */
  fields: DecryptFieldRequest[];
}

/** Response shape for a successful decryption. */
interface DecryptDataResponse {
  /** Decrypted values in the same order as the request fields. */
  decrypted: Array<{
    fieldType: string;
    plaintext: string;
  }>;
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
  let body: DecryptDataRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { businessId, fields } = body;

  if (!businessId) {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "businessId is required" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "fields array is required and must not be empty" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Limit batch size to prevent abuse
  if (fields.length > 50) {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Maximum 50 fields per request" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Validate field types
  const validFieldTypes = new Set(["customer_phone", "customer_name", "feedback_text"]);
  for (const field of fields) {
    if (!field.ciphertext || typeof field.ciphertext !== "string") {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Each field must have a ciphertext string" } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (!field.fieldType || !validFieldTypes.has(field.fieldType)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid fieldType. Must be one of: ${[...validFieldTypes].join(", ")}`,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 3. Verify the caller owns the business (authorization check)
  const serviceClient = createSupabaseClient();
  const profileResult = await getBusinessProfile(serviceClient, user.id);

  if (!profileResult.success) {
    console.error(
      "[decrypt-data] Failed to get business profile:",
      sanitizeForLogging({ userId: user.id, error: profileResult.error.message }),
    );
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Business profile not found" } }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const profile = profileResult.data;

  // Ensure the requested businessId matches the authenticated user's business
  if (profile.id !== businessId) {
    console.error(
      "[decrypt-data] Authorization failed: user business does not match requested businessId",
      sanitizeForLogging({ userId: user.id, userBusinessId: profile.id, requestedBusinessId: businessId }),
    );
    return new Response(
      JSON.stringify({ error: { code: "AUTH_ERROR", message: "Not authorized to decrypt data for this business" } }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. Decrypt all requested fields
  try {
    const decrypted: DecryptDataResponse["decrypted"] = [];

    for (const field of fields) {
      // Skip empty ciphertexts
      if (!field.ciphertext.trim()) {
        decrypted.push({ fieldType: field.fieldType, plaintext: "" });
        continue;
      }

      const plaintext = await decrypt(field.ciphertext);
      decrypted.push({ fieldType: field.fieldType, plaintext });
    }

    const response: DecryptDataResponse = { decrypted };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown decryption error";
    console.error(
      "[decrypt-data] Decryption failed:",
      sanitizeForLogging({ userId: user.id, businessId, error: errorMessage }),
    );

    return new Response(
      JSON.stringify({ error: { code: "SERVER_ERROR", message: "Failed to decrypt data" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
