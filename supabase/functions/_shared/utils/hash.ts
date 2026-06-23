/**
 * Phone number hashing utility for deterministic lookups.
 *
 * AES-256-GCM with random IVs produces different ciphertext each time,
 * so we cannot use encrypted values for equality lookups. This module
 * provides a deterministic HMAC-SHA256 hash for phone number lookups
 * while the encrypted field preserves the actual data securely.
 */

/**
 * Produce a deterministic HMAC-SHA256 hash of a phone number.
 * Used for looking up review requests by customer phone in the webhook.
 *
 * @param phone - The normalized phone number (digits only) to hash.
 * @returns A hex-encoded HMAC-SHA256 hash string.
 */
export async function hashPhone(phone: string): Promise<string> {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex) {
    throw new Error("Missing ENCRYPTION_KEY environment variable");
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyHex);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const data = encoder.encode(normalizePhone(phone));
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);

  return bytesToHex(new Uint8Array(signature));
}

/**
 * Normalize a phone number to digits only for consistent hashing.
 * Strips all non-digit characters (parentheses, dashes, spaces, +).
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If the number starts with country code '1' and is 11 digits, strip the leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.substring(1);
  }
  return digits;
}

/** Convert a Uint8Array to a hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
