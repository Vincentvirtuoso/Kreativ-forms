"use client";

import { KreativUIProvider, PersistMode } from "@splenddev/kreativ-ui";
import { kreativFormsTheme } from "../../theme";

export function UIProvider({ children }: { children: React.ReactNode }) {
  return (
    <KreativUIProvider
      theme={kreativFormsTheme}
      background="rgb(var(--kui-background, 255 255 255))"
      textColor="rgb(var(--kui-text, 0 0 0))"
      defaultMode="dark"
      className="min-h-screen"
    >
      <PersistMode storageKey="kui-theme-mode" />
      {children}
    </KreativUIProvider>
  );
}
