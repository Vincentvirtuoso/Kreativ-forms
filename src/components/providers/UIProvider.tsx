"use client";

import { KreativUIProvider } from "@splenddev/kreativ-ui";
import { kreativFormsTheme } from "../../theme";

export function UIProvider({ children }: { children: React.ReactNode }) {
  return (
    <KreativUIProvider
      theme={kreativFormsTheme}
      background="rgb(var(--kui-colors-background, 255 255 255))"
      textColor="rgb(var(--kui-colors-text, 0 0 0))"
      defaultMode="dark"
      className="min-h-screen"
      persistMode
      storageKey="kui-theme-mode"
    >
      {children}
    </KreativUIProvider>
  );
}
