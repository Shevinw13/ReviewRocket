/**
 * appstore-webhook Edge Function
 *
 * Handles Apple App Store Server Notifications V2 for subscription lifecycle events.
 * Processes subscription purchases, renewals, and expirations, updating
 * the business owner's subscription tier and SMS quota accordingly.
 *
 * The App Store sends a signed JWS (JSON Web Signature) payload containing
 * notification details. This function decodes the payload, maps product IDs
 * to subscription tiers, and updates the database within 10 seconds of confirmation.
 *
 * Requirements: 8.6, 8.7
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient } from "../_shared/adapters/supabase.adapter.ts";
import { sanitizeForLogging } from "../_shared/utils/sanitize.ts";
import type { SubscriptionTier } from "../_shared/types/index.ts";
import { TIER_QUOTAS } from "../_shared/types/index.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

/** App Store product ID to subscription tier mapping. */
const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  "com.nudgli.starter": "starter",
  "com.nudgli.growth": "growth",
  "com.nudgli.pro": "pro",
};

/** App Store Server Notification V2 types we handle. */
const HANDLED_NOTIFICATION_TYPES = [
  "SUBSCRIBED",
  "DID_RENEW",
  "DID_CHANGE_RENEWAL_STATUS",
  "EXPIRED",
] as const;

type HandledNotificationType = typeof HANDLED_NOTIFICATION_TYPES[number];

// ─── Types ──────────────────────────────────────────────────────────────────

/** Decoded App Store Server Notification V2 payload. */
interface AppStoreNotificationPayload {
  notificationType: string;
  subtype?: string;
  data: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
  version: string;
  notificationUUID: string;
}

/** Decoded transaction info from the JWS. */
interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  appAccountToken?: string;
  expiresDate?: number;
  purchaseDate?: number;
  environment: string;
}

/** Decoded renewal info from the JWS. */
interface RenewalInfo {
  productId: string;
  autoRenewStatus: number;
  originalTransactionId: string;
}

// ─── JWS Decoding ───────────────────────────────────────────────────────────

/**
 * Decode a JWS (JSON Web Signature) payload without full verification.
 *
 * In production, you should verify the signature against Apple's public keys.
 * For MVP, we decode the payload portion (base64url-encoded JSON) from the
 * three-part JWS token (header.payload.signature).
 *
 * Apple's App Store Server Notifications V2 use JWS (RFC 7515) with x5c
 * certificate chain in the header. Full verification involves:
 * 1. Extracting the x5c certificate chain from the JWS header
 * 2. Verifying the chain against Apple's root CA
 * 3. Verifying the JWS signature with the leaf certificate's public key
 *
 * Note: The request also comes over HTTPS to the function URL which provides
 * transport-level authentication.
 */
function decodeJWSPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format: expected 3 parts separated by '.'");
  }

  // Decode the payload (second part) from base64url
  const payloadBase64 = parts[1];
  // Convert base64url to standard base64
  const base64 = payloadBase64
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  // Pad if necessary
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  const decoded = atob(padded);
  return JSON.parse(decoded) as T;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map a product ID to a subscription tier.
 * Returns null if the product ID is not recognized.
 */
function mapProductIdToTier(productId: string): SubscriptionTier | null {
  return PRODUCT_ID_TO_TIER[productId] || null;
}

/**
 * Check if a notification type is one we handle.
 */
function isHandledNotificationType(type: string): type is HandledNotificationType {
  return (HANDLED_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/**
 * Log an event with sanitized data.
 */
function logEvent(
  level: "info" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>,
): void {
  const logData = {
    function: "appstore-webhook",
    timestamp: new Date().toISOString(),
    message,
    ...(data ? { context: sanitizeForLogging(data) } : {}),
  };

  switch (level) {
    case "info":
      console.log(JSON.stringify(logData));
      break;
    case "warn":
      console.warn(JSON.stringify(logData));
      break;
    case "error":
      console.error(JSON.stringify(logData));
      break;
  }
}

// ─── Subscription Handlers ──────────────────────────────────────────────────

/**
 * Handle SUBSCRIBED and DID_RENEW notifications.
 * Updates the business owner's subscription tier and resets usage on renewal.
 */
async function handleSubscriptionActive(
  client: ReturnType<typeof createSupabaseClient>,
  transactionInfo: TransactionInfo,
  notificationType: HandledNotificationType,
): Promise<Response> {
  const { productId, appAccountToken } = transactionInfo;

  // Map product ID to tier
  const tier = mapProductIdToTier(productId);
  if (!tier) {
    logEvent("warn", "Unknown product ID in subscription notification", {
      productId,
      notificationType,
    });
    return new Response(JSON.stringify({ error: "Unknown product ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve the business owner by appAccountToken (auth_user_id or business_id)
  // appAccountToken is set during the purchase flow to link the IAP to the user.
  if (!appAccountToken) {
    logEvent("error", "Missing appAccountToken in transaction info", {
      notificationType,
      productId,
    });
    return new Response(
      JSON.stringify({ error: "Missing appAccountToken" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Look up business owner by auth_user_id (appAccountToken stores the user ID)
  const { data: businessOwner, error: lookupError } = await client
    .from("business_owners")
    .select("id, subscription_tier, sms_used_this_period, billing_period_start")
    .eq("auth_user_id", appAccountToken)
    .single();

  if (lookupError || !businessOwner) {
    logEvent("error", "Business owner not found for appAccountToken", {
      notificationType,
      hasError: !!lookupError,
      errorMessage: lookupError?.message,
    });
    return new Response(
      JSON.stringify({ error: "Business owner not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build the update payload
  const updatePayload: Record<string, unknown> = {
    subscription_tier: tier,
    updated_at: new Date().toISOString(),
  };

  // On DID_RENEW: reset sms_used_this_period and update billing_period_start
  if (notificationType === "DID_RENEW") {
    updatePayload.sms_used_this_period = 0;
    updatePayload.billing_period_start = new Date().toISOString();
  }

  // On SUBSCRIBED (new subscription): also reset usage and set billing start
  if (notificationType === "SUBSCRIBED") {
    updatePayload.sms_used_this_period = 0;
    updatePayload.billing_period_start = new Date().toISOString();
  }

  // Perform the update (Requirement 8.7: within 10 seconds)
  const { error: updateError } = await client
    .from("business_owners")
    .update(updatePayload)
    .eq("id", businessOwner.id);

  if (updateError) {
    logEvent("error", "Failed to update business owner subscription", {
      businessId: businessOwner.id,
      tier,
      notificationType,
      errorMessage: updateError.message,
    });
    return new Response(
      JSON.stringify({ error: "Failed to update subscription" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  logEvent("info", "Subscription updated successfully", {
    businessId: businessOwner.id,
    previousTier: businessOwner.subscription_tier,
    newTier: tier,
    notificationType,
    quotaReset: notificationType === "DID_RENEW" || notificationType === "SUBSCRIBED",
  });

  return new Response(
    JSON.stringify({ success: true, tier, quota: TIER_QUOTAS[tier] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Handle EXPIRED notifications.
 * Downgrades the business owner to starter tier.
 */
async function handleSubscriptionExpired(
  client: ReturnType<typeof createSupabaseClient>,
  transactionInfo: TransactionInfo,
): Promise<Response> {
  const { appAccountToken } = transactionInfo;

  if (!appAccountToken) {
    logEvent("error", "Missing appAccountToken in expired notification", {
      notificationType: "EXPIRED",
    });
    return new Response(
      JSON.stringify({ error: "Missing appAccountToken" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Look up business owner
  const { data: businessOwner, error: lookupError } = await client
    .from("business_owners")
    .select("id, subscription_tier")
    .eq("auth_user_id", appAccountToken)
    .single();

  if (lookupError || !businessOwner) {
    logEvent("error", "Business owner not found for expired notification", {
      hasError: !!lookupError,
      errorMessage: lookupError?.message,
    });
    return new Response(
      JSON.stringify({ error: "Business owner not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Downgrade to starter tier
  const { error: updateError } = await client
    .from("business_owners")
    .update({
      subscription_tier: "starter" as SubscriptionTier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessOwner.id);

  if (updateError) {
    logEvent("error", "Failed to downgrade subscription on expiry", {
      businessId: businessOwner.id,
      errorMessage: updateError.message,
    });
    return new Response(
      JSON.stringify({ error: "Failed to downgrade subscription" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  logEvent("info", "Subscription expired - downgraded to starter", {
    businessId: businessOwner.id,
    previousTier: businessOwner.subscription_tier,
    newTier: "starter",
  });

  return new Response(
    JSON.stringify({ success: true, tier: "starter", quota: TIER_QUOTAS.starter }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Handle DID_CHANGE_RENEWAL_STATUS notifications.
 * Logs the renewal status change for monitoring purposes.
 * The actual tier change happens on SUBSCRIBED/DID_RENEW/EXPIRED.
 */
async function handleRenewalStatusChange(
  client: ReturnType<typeof createSupabaseClient>,
  transactionInfo: TransactionInfo,
  renewalInfo: RenewalInfo | null,
): Promise<Response> {
  const { appAccountToken } = transactionInfo;

  logEvent("info", "Renewal status changed", {
    appAccountToken: appAccountToken ? "[present]" : "[missing]",
    autoRenewStatus: renewalInfo?.autoRenewStatus,
    productId: renewalInfo?.productId || transactionInfo.productId,
  });

  // No database changes needed — actual tier changes happen on renewal/expiry events
  return new Response(
    JSON.stringify({ success: true, action: "logged" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Parse the request body containing the signedPayload
  let signedPayload: string;

  try {
    const body = await req.json();
    signedPayload = body.signedPayload;

    if (!signedPayload) {
      logEvent("error", "Missing signedPayload in request body");
      return new Response(
        JSON.stringify({ error: "Missing signedPayload" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    logEvent("error", "Failed to parse request body", {
      error: (err as Error).message,
    });
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Decode the outer JWS to get the notification payload
  let notificationPayload: AppStoreNotificationPayload;

  try {
    notificationPayload = decodeJWSPayload<AppStoreNotificationPayload>(signedPayload);
  } catch (err) {
    logEvent("error", "Failed to decode notification JWS", {
      error: (err as Error).message,
    });
    return new Response(
      JSON.stringify({ error: "Invalid JWS payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { notificationType, data: notificationData } = notificationPayload;

  logEvent("info", "Received App Store notification", {
    notificationType,
    notificationUUID: notificationPayload.notificationUUID,
    version: notificationPayload.version,
  });

  // 3. Check if we handle this notification type
  if (!isHandledNotificationType(notificationType)) {
    logEvent("info", "Ignoring unhandled notification type", { notificationType });
    return new Response(
      JSON.stringify({ success: true, action: "ignored", notificationType }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. Decode the signed transaction info
  if (!notificationData.signedTransactionInfo) {
    logEvent("error", "Missing signedTransactionInfo in notification data", {
      notificationType,
    });
    return new Response(
      JSON.stringify({ error: "Missing signedTransactionInfo" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let transactionInfo: TransactionInfo;

  try {
    transactionInfo = decodeJWSPayload<TransactionInfo>(
      notificationData.signedTransactionInfo,
    );
  } catch (err) {
    logEvent("error", "Failed to decode transaction info JWS", {
      error: (err as Error).message,
      notificationType,
    });
    return new Response(
      JSON.stringify({ error: "Invalid transaction info" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 5. Optionally decode renewal info
  let renewalInfo: RenewalInfo | null = null;

  if (notificationData.signedRenewalInfo) {
    try {
      renewalInfo = decodeJWSPayload<RenewalInfo>(
        notificationData.signedRenewalInfo,
      );
    } catch (err) {
      logEvent("warn", "Failed to decode renewal info JWS (non-fatal)", {
        error: (err as Error).message,
      });
    }
  }

  // 6. Create Supabase service client for database operations
  const serviceClient = createSupabaseClient();

  // 7. Route to appropriate handler based on notification type
  switch (notificationType) {
    case "SUBSCRIBED":
    case "DID_RENEW":
      return await handleSubscriptionActive(
        serviceClient,
        transactionInfo,
        notificationType,
      );

    case "EXPIRED":
      return await handleSubscriptionExpired(serviceClient, transactionInfo);

    case "DID_CHANGE_RENEWAL_STATUS":
      return await handleRenewalStatusChange(
        serviceClient,
        transactionInfo,
        renewalInfo,
      );

    default:
      return new Response(
        JSON.stringify({ success: true, action: "ignored" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
  }
});
