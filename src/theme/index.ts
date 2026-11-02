import { extendTheme } from "@splenddev/kreativ-ui/core";

import { tokens } from "./tokens";
import { semanticTokens } from "./semantic-tokens";
import { typography } from "./typography";

export const kreativFormsTheme = extendTheme({
  tokens,
  semanticTokens,
  typography,
  recipes: {},
  intensity: 50,
  sizes: {},
});
