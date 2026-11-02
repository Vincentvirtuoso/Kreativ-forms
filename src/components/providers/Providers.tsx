import { AppShell } from "./AppShell";
import { UIProvider } from "./UIProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <AppShell>{children} </AppShell>
    </UIProvider>
  );
}
