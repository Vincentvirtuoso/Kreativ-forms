import { defineTypography } from "@splenddev/kreativ-ui/core";

export const typography = defineTypography({
  body: {
    fontFamily: "{fonts.sans}",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  heading: {
    fontFamily: "{fonts.heading}",
    fontWeight: 600,
    letterSpacing: "-0.04em",
  },

  display: {
    fontFamily: "{fonts.heading}",
    fontWeight: 600,
    letterSpacing: "-0.06em",
  },

  label: {
    fontFamily: "{fonts.sans}",
    fontSize: "12px",
    fontWeight: 500,
  },

  mono: {
    fontFamily: "{fonts.mono}",
    fontSize: "12px",
    lineHeight: "1.5",
  },
});
