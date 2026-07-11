/**
 * SMS message templates by business type.
 *
 * Each template generates a customer-facing feedback request SMS.
 * The business type determines the tone and wording so it feels
 * natural for the industry (trades vs restaurant vs salon, etc.)
 */

import type { BusinessType } from '@/types';

/**
 * Generates the SMS message body based on business type, business name,
 * and optional customer name.
 */
export function generateSmsMessage(
  businessType: BusinessType | undefined,
  businessName: string,
  customerName?: string,
): string {
  const greeting = customerName ? `Hi ${customerName}, ` : '';
  const closing = 'On a scale of 1-5, how would you rate your experience? Reply with a number from 1 to 5.';

  switch (businessType) {
    case 'trades':
      return `${greeting}Thanks for trusting ${businessName} with your recent job. We'd love to know how we did. ${closing}`;

    case 'restaurant':
      return `${greeting}Thanks for dining with ${businessName}. We hope you enjoyed your meal! ${closing}`;

    case 'health_beauty':
      return `${greeting}Thanks for your recent visit to ${businessName}. We hope you left feeling great! ${closing}`;

    case 'professional':
      return `${greeting}Thanks for choosing ${businessName} for your recent appointment. Your feedback helps us improve. ${closing}`;

    case 'other':
    default:
      return `${greeting}Thank you for choosing ${businessName}. Small businesses like ours rely on customer feedback to grow and improve. ${closing}`;
  }
}

/** Human-readable labels for each business type. */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  trades: 'Home & Trades',
  restaurant: 'Restaurant & Food',
  health_beauty: 'Health & Beauty',
  professional: 'Professional Services',
  other: 'Other',
};

/** Icon names (Ionicons) for each business type. */
export const BUSINESS_TYPE_ICONS: Record<BusinessType, string> = {
  trades: 'hammer-outline',
  restaurant: 'restaurant-outline',
  health_beauty: 'cut-outline',
  professional: 'briefcase-outline',
  other: 'grid-outline',
};
