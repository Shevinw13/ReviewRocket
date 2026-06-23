/**
 * Tailwind CSS configuration for Review Rocket.
 * Theme tokens are defined in src/theme/ for programmatic use
 * and mirrored here for Tailwind utility class generation.
 *
 * Keep these values in sync with:
 *   - src/theme/colors.ts
 *   - src/theme/spacing.ts
 *   - src/theme/typography.ts
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: "#0B1736",
        "rocket-orange": "#FF6B35",
        "success-green": "#22C55E",
        "card-bg": "#F8FAFC",
        "light-gray": "#E5E7EB",
      },
      spacing: {
        "0": "0px",
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
      },
      fontSize: {
        heading: ["24px", { lineHeight: "32px" }],
        body: ["16px", { lineHeight: "24px" }],
        caption: ["12px", { lineHeight: "16px" }],
      },
    },
  },
  plugins: [],
};
