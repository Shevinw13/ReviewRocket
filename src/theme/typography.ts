/**
 * Typography hierarchy for Review Rocket.
 * 3 distinct levels with minimum 4pt difference between each:
 * - Heading: 24pt (for screen titles, section headers)
 * - Body: 16pt (for primary content, form labels)
 * - Caption: 12pt (for timestamps, helper text, badges)
 *
 * Differences: Heading→Body = 8pt, Body→Caption = 4pt
 */
export const typography = {
  heading: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
} as const;

/**
 * Tailwind-compatible fontSize map for use in tailwind.config.js.
 * Format: [fontSize, { lineHeight }]
 */
export const tailwindFontSize = {
  heading: ['24px', { lineHeight: '32px' }],
  body: ['16px', { lineHeight: '24px' }],
  caption: ['12px', { lineHeight: '16px' }],
} as const;

export type TypographyLevel = keyof typeof typography;
