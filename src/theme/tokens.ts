import { defineToken } from "@splenddev/kreativ-ui/core";

export const tokens = {
  colors: {
    neutral: {
      50: defineToken("#FAFAFA"),
      100: defineToken("#F5F5F5"),
      200: defineToken("#E5E5E5"),
      300: defineToken("#D4D4D4"),
      400: defineToken("#A3A3A3"),
      500: defineToken("#737373"),
      600: defineToken("#525252"),
      700: defineToken("#404040"),
      800: defineToken("#262626"),
      900: defineToken("#171717"),
      950: defineToken("#0A0A0A"),
    },
    violet: {
      50: { value: "#fff" },
    },
  },

  fonts: {
    sans: defineToken("var(--font-body), sans-serif"),
    heading: defineToken("var(--font-heading), sans-serif"),
    mono: defineToken("var(--font-mono), monospace"),
  },
} as const;
