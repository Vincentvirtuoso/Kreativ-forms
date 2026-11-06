import { SettingsProvider } from "@/features/settings/providers/settings-provider";
import { AppShell } from "./AppShell";
import { UIProvider } from "./UIProvider";
import { ConfirmProvider } from "./ConfirmProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <SettingsProvider>
        <ConfirmProvider>
         <AppShell>{children} </AppShell>
        </ConfirmProvider>
      </SettingsProvider>
    </UIProvider>
  );
}
