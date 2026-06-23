/**
 * Encryption utilities for Edge Functions.
 * Uses AES-256-GCM via the Web Crypto API (Deno native).
 * The encryption key is read from the ENCRYPTION_KEY environment variable.
 *
 * Requirement 10.1: Encrypt customer phone numbers, customer names, and
 * feedback text at rest using AES-256 encryption.
 */

/** Size of the initialization vector (IV) in bytes. */
const IV_LENGTH = 12;

/** AES-GCM tag length in bits. */
const TAG_LENGTH = 128;

/**
 * Derive a CryptoKey from the ENCRYPTION_KEY environment variable.
 * The key must be a 64-character hex string (32 bytes = 256 bits).
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex) {
    throw new Error("Missing ENCRYPTION_KEY environment variable");
  }

  if (keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (256 bits)",
    );
  }

  const keyBytes = hexToBytes(keyHex);

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing: IV (12 bytes) + ciphertext + auth tag.
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    return "";
  }

  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    data,
  );

  // Combine IV + ciphertext (includes auth tag) into a single buffer
  const combined = new Uint8Array(IV_LENGTH + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), IV_LENGTH);

  return bytesToBase64(combined);
}

/**
 * Decrypt a base64-encoded ciphertext that was encrypted with AES-256-GCM.
 * Expects the format: base64(IV + ciphertext + auth tag).
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) {
    return "";
  }

  const key = await getEncryptionKey();
  const combined = base64ToBytes(ciphertext);

  if (combined.length < IV_LENGTH + 1) {
    throw new Error("Invalid ciphertext: too short");
  }

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    data,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// ─── Helper functions ────────────────────────────────────────────────────────

/** Convert a hex string to a Uint8Array. */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert a Uint8Array to a base64 string. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Convert a base64 string to a Uint8Array. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
