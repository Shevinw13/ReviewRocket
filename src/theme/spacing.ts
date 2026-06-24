/**
 * Consistent spacing scale for Nudg.
 * Based on a 4pt grid system for visual harmony.
 * Use these values for margins, paddings, and gaps.
 */
export const spacing = {
  /** 0pt */
  none: 0,
  /** 2pt - Minimal spacing (icon padding) */
  '2xs': 2,
  /** 4pt - Tight spacing (inline elements) */
  xs: 4,
  /** 8pt - Compact spacing (between related items) */
  sm: 8,
  /** 12pt - Default inner padding */
  md: 12,
  /** 16pt - Standard spacing (card padding, list gaps) */
  lg: 16,
  /** 20pt - Comfortable spacing */
  xl: 20,
  /** 24pt - Section spacing */
  '2xl': 24,
  /** 32pt - Large section gaps */
  '3xl': 32,
  /** 40pt - Screen-level padding */
  '4xl': 40,
  /** 48pt - Major section separation */
  '5xl': 48,
  /** 64pt - Extra large spacing */
  '6xl': 64,
} as const;

/**
 * Tailwind-compatible spacing map for use in tailwind.config.js.
 */
export const tailwindSpacing = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
} as const;

export type SpacingKey = keyof typeof spacing;
