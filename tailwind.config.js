/**
 * Tailwind CSS configuration for Nudgli.
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
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        navy: "#0B1D3A",
        teal: "#0CBFA6",
        mint: "#E6F9F6",
        "success-green": "#22C55E",
        "card-bg": "#F2F4F7",
        "light-gray": "#E5E7EB",
        "dark-bg": "#0F1419",
        "dark-card": "#1A2332",
        "dark-border": "#2A3A4E",
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
