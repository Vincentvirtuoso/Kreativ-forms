import { SettingsProvider } from "@/features/settings/providers/settings-provider";
import { AppShell } from "./AppShell";
import { UIProvider } from "./UIProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <SettingsProvider>
        <AppShell>{children} </AppShell>
      </SettingsProvider>
    </UIProvider>
  );
}
