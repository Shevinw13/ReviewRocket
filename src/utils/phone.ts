/**
 * Phone number formatting and validation utilities.
 * Handles US phone numbers in various input formats.
 */

/**
 * Strips all non-digit characters from the input.
 * If the result is 11 digits and starts with '1', removes the leading '1'.
 * Returns the normalized 10-digit string.
 */
export function normalizePhoneNumber(input: string): string {
  let digits = input.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Formats a phone number string into (XXX) XXX-XXXX format.
 * If the normalized input doesn't have exactly 10 digits, returns the input as-is.
 */
export function formatPhoneNumber(input: string): string {
  const digits = normalizePhoneNumber(input);

  if (digits.length !== 10) {
    return input;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Returns true if the normalized form of the input has exactly 10 digits.
 */
export function isValidUSPhoneNumber(input: string): boolean {
  const digits = normalizePhoneNumber(input);
  return digits.length === 10;
}
