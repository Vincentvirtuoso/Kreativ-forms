import { defineSemanticTokens } from "@splenddev/kreativ-ui/core";

export const semanticTokens = {
  colors: defineSemanticTokens({
    background: {
      light: "{colors.neutral.50}",
      dark: "{colors.neutral.950}",
    },

    brand: { light: "{colors.violet.500}", dark: "{colors.violet.400}" },

    brandHover: { light: "{colors.violet.600}", dark: "{colors.violet.300}" },

    brandFg: "{colors.white}",

    dark: "{colors.neutral.900}",

    foreground: {
      light: "{colors.neutral.900}",
      dark: "{colors.neutral.50}",
    },

    textMuted: {
      light: "{colors.neutral.500}",
      dark: "{colors.neutral.400}",
    },

    border: {
      light: "{colors.neutral.200}",
      dark: "{colors.neutral.700}",
    },

    surfaceMuted: {
      light: "{colors.neutral.100}",
      dark: "{colors.neutral.800}",
    },
  }),
};
