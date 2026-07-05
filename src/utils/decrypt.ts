/**
 * Client-side utility for decrypting encrypted fields via the decrypt-data Edge Function.
 * Used to decrypt customer names, phone numbers, and feedback text for display.
 *
 * The encryption key never leaves the server — all decryption happens server-side.
 */

import { supabase } from '@/infrastructure/supabase/client';

type DecryptFieldType = 'customer_phone' | 'customer_name' | 'feedback_text';

interface DecryptField {
  ciphertext: string;
  fieldType: DecryptFieldType;
}

interface DecryptResponse {
  decrypted: Array<{
    fieldType: string;
    plaintext: string;
  }>;
}

// Simple in-memory cache to avoid re-decrypting the same values
const decryptCache = new Map<string, string>();
const CACHE_MAX_SIZE = 500;

/**
 * Decrypt a batch of encrypted fields via the decrypt-data Edge Function.
 * Returns a map of ciphertext → plaintext for easy lookup.
 */
export async function decryptFields(
  businessId: string,
  fields: DecryptField[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  if (fields.length === 0) return result;

  // Check cache first, collect uncached items
  const uncachedFields: DecryptField[] = [];
  for (const field of fields) {
    if (!field.ciphertext) continue;
    const cached = decryptCache.get(field.ciphertext);
    if (cached !== undefined) {
      result.set(field.ciphertext, cached);
    } else {
      uncachedFields.push(field);
    }
  }

  if (uncachedFields.length === 0) return result;

  // Get current auth session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    // Can't decrypt without auth — return ciphertexts as-is won't help,
    // so return empty strings for undecrypted fields
    return result;
  }

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const response = await fetch(`${supabaseUrl}/functions/v1/decrypt-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        businessId,
        fields: uncachedFields,
      }),
    });

    if (!response.ok) {
      console.warn('[decrypt] Failed to decrypt fields:', response.status);
      return result;
    }

    const data: DecryptResponse = await response.json();

    // Map results back and update cache
    for (let i = 0; i < uncachedFields.length; i++) {
      const plaintext = data.decrypted[i]?.plaintext ?? '';
      const ciphertext = uncachedFields[i].ciphertext;
      result.set(ciphertext, plaintext);

      // Update cache (evict oldest if full)
      if (decryptCache.size >= CACHE_MAX_SIZE) {
        const firstKey = decryptCache.keys().next().value;
        if (firstKey) decryptCache.delete(firstKey);
      }
      decryptCache.set(ciphertext, plaintext);
    }
  } catch (err) {
    console.warn('[decrypt] Error calling decrypt-data:', err);
  }

  return result;
}

/**
 * Decrypt a single field. Convenience wrapper around decryptFields.
 */
export async function decryptField(
  businessId: string,
  ciphertext: string,
  fieldType: DecryptFieldType,
): Promise<string> {
  if (!ciphertext) return '';
  const result = await decryptFields(businessId, [{ ciphertext, fieldType }]);
  return result.get(ciphertext) ?? ciphertext;
}
