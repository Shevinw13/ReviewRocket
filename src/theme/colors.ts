/**
 * Review Rocket color palette.
 * Brand personality: Modern, Trustworthy, Professional, Fast, Simple.
 * Inspired by Stripe, Ramp, Square, Linear.
 */
export const colors = {
  /** Navy - Primary dark, used for text and backgrounds */
  navy: '#0B1736',
  /** Rocket Orange - Primary accent, CTAs and active elements */
  rocketOrange: '#FF6B35',
  /** Success Green - Positive feedback, success states */
  successGreen: '#22C55E',
  /** White - Base background */
  white: '#FFFFFF',
  /** Card Background - Elevated surface color */
  cardBackground: '#F8FAFC',
  /** Light Gray - Borders, dividers, disabled states */
  lightGray: '#E5E7EB',
} as const;

/**
 * Tailwind-compatible color map for use in tailwind.config.js.
 * Keys match Tailwind naming conventions (kebab-case).
 */
export const tailwindColors = {
  navy: '#0B1736',
  'rocket-orange': '#FF6B35',
  'success-green': '#22C55E',
  white: '#FFFFFF',
  'card-bg': '#F8FAFC',
  'light-gray': '#E5E7EB',
} as const;

export type ColorKey = keyof typeof colors;
