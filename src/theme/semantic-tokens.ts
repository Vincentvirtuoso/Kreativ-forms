import { defineSemanticTokens } from "@splenddev/kreativ-ui/core";

export const semanticTokens = {
  colors: defineSemanticTokens({
    // App surfaces
    background: {
      light: "{colors.neutral.50}",
      dark: "{colors.neutral.950}",
    },

    surface: {
      light: "{colors.white}",
      dark: "{colors.neutral.900}",
    },

    surfaceMuted: {
      light: "{colors.neutral.100}",
      dark: "{colors.neutral.800}",
    },

    surfaceSubtle: {
      light: "{colors.neutral.50}",
      dark: "{colors.neutral.900}",
    },

    // Brand
    brand: {
      light: "{colors.neutral.900}",
      dark: "{colors.white}",
    },

    brandHover: {
      light: "{colors.neutral.700}",
      dark: "{colors.neutral.200}",
    },

    brandActive: {
      light: "{colors.neutral.950}",
      dark: "{colors.neutral.100}",
    },

    brandFg: {
      light: "{colors.white}",
      dark: "{colors.neutral.950}",
    },

    foreground: {
      light: "{colors.neutral.950}",
      dark: "{colors.neutral.50}",
    },

    text: {
      light: "{colors.neutral.700}",
      dark: "{colors.neutral.300}",
    },

    textMuted: {
      light: "{colors.neutral.500}",
      dark: "{colors.neutral.400}",
    },

    textSubtle: {
      light: "{colors.neutral.400}",
      dark: "{colors.neutral.500}",
    },

    border: {
      light: "{colors.neutral.200}",
      dark: "{colors.neutral.800}",
    },

    borderStrong: {
      light: "{colors.neutral.300}",
      dark: "{colors.neutral.700}",
    },

    borderSubtle: {
      light: "{colors.neutral.100}",
      dark: "{colors.neutral.900}",
    },

    focusRing: {
      light: "{colors.neutral.500}",
      dark: "{colors.neutral.400}",
    },

    selection: {
      light: "{colors.neutral.200}",
      dark: "{colors.neutral.700}",
    },
  }),
};
