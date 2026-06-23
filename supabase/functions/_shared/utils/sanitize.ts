/**
 * Data sanitization utility for Edge Functions.
 * Strips sensitive customer data from objects before logging.
 *
 * Requirement 10.5: Exclude customer phone numbers, customer names,
 * and feedback text from application logs.
 * Requirement 14.1, 14.3: Exclude sensitive customer data from error reports.
 */

/** Field names that must be redacted from log contexts. */
const SENSITIVE_FIELDS = new Set([
  "customerPhone",
  "customerName",
  "feedbackText",
  // Also handle snake_case variants from database rows
  "customer_phone",
  "customer_name",
  "feedback_text",
  // And encrypted variants
  "customer_phone_encrypted",
  "customer_name_encrypted",
  "feedback_text_encrypted",
]);

/** The value used to replace sensitive data. */
const REDACTED = "[REDACTED]";

/**
 * Recursively sanitizes an object by stripping sensitive fields.
 * Returns a deep copy with customerPhone, customerName, and feedbackText
 * fields replaced with "[REDACTED]".
 *
 * All other fields are preserved unchanged.
 *
 * @param obj - The object to sanitize (can be any value).
 * @returns A sanitized copy of the object.
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item));
  }

  const sanitized: Record<string, unknown> = {};
  const source = obj as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = REDACTED;
    } else if (
      typeof source[key] === "object" &&
      source[key] !== null
    ) {
      sanitized[key] = sanitizeForLogging(source[key]);
    } else {
      sanitized[key] = source[key];
    }
  }

  return sanitized;
}
