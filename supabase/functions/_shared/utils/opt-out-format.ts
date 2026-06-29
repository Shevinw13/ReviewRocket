/**
 * Pure formatting utilities for SMS opt-out/opt-in messaging.
 *
 * These functions produce user-facing text for inbox items
 * and activity feed entries related to SMS opt-out handling.
 */

/**
 * Returns the inbox body text for an opt-out notification.
 *
 * Uses customerName if available, else phoneFormatted, else "A customer".
 */
export function formatOptOutInboxBody(
  customerName?: string,
  phoneFormatted?: string,
): string {
  const name = customerName || phoneFormatted || "A customer";
  return `${name} has chosen to stop receiving SMS messages from your business. Future review requests cannot be sent to this phone number unless they opt back in.`;
}

/**
 * Returns the activity feed description for an opt-out event.
 *
 * Uses customerName if available, else phoneFormatted, else "A customer".
 */
export function formatOptOutActivityDescription(
  customerName?: string,
  phoneFormatted?: string,
): string {
  const name = customerName || phoneFormatted || "A customer";
  return `${name} opted out of SMS messaging`;
}

/**
 * Returns the activity feed description for an opt-in event.
 *
 * Uses customerName if available, else phoneFormatted, else "A customer".
 */
export function formatOptInActivityDescription(
  customerName?: string,
  phoneFormatted?: string,
): string {
  const name = customerName || phoneFormatted || "A customer";
  return `${name} opted back in to SMS messaging`;
}
