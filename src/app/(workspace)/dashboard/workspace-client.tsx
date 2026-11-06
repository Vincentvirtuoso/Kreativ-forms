"use client";

import dynamic from "next/dynamic";

import type { DashboardTab } from "@/features/dashboard/dashboard.types";

const DashboardWorkspace = dynamic(
  () =>
    import("@/features/dashboard/components/DashboardWorkspace").then((m) => ({
      default: m.DashboardWorkspace,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface-raised" />
      </div>
    ),
  },
);

export function WorkspaceClient({ activeTab }: { activeTab: DashboardTab }) {
  return <DashboardWorkspace activeTab={activeTab} />;
}