/**
 * Nudg color palette.
 * Brand personality: Modern, Trustworthy, Professional, Fast, Simple.
 * Inspired by Stripe, Ramp, Square, Linear.
 */
export const colors = {
  /** Navy - Primary dark, used for text and backgrounds */
  navy: '#0B1D3A',
  /** Teal - Primary accent, CTAs and active elements */
  teal: '#0CBFA6',
  /** Mint - Light teal accent for backgrounds */
  mint: '#E6F9F6',
  /** Success Green - Positive feedback, success states */
  successGreen: '#22C55E',
  /** White - Base background */
  white: '#FFFFFF',
  /** Card Background - Elevated surface color */
  cardBackground: '#F2F4F7',
  /** Light Gray - Borders, dividers, disabled states */
  lightGray: '#E5E7EB',
} as const;

/**
 * Tailwind-compatible color map for use in tailwind.config.js.
 * Keys match Tailwind naming conventions (kebab-case).
 */
export const tailwindColors = {
  navy: '#0B1D3A',
  teal: '#0CBFA6',
  mint: '#E6F9F6',
  'success-green': '#22C55E',
  white: '#FFFFFF',
  'card-bg': '#F2F4F7',
  'light-gray': '#E5E7EB',
} as const;

export type ColorKey = keyof typeof colors;
