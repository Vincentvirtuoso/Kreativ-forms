// app/(workspace)/dashboard/page.tsx
import type { Metadata } from "next";

import type { DashboardTab } from "@/features/dashboard/dashboard.types";
import { validTabs } from "@/features/dashboard/utils/dashboard.utils";

import { WorkspaceClient } from "./workspace-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;

  // Handle `?tab=a&tab=b` — .includes() would otherwise return false for arrays
  const raw = Array.isArray(tab) ? tab[0] : tab;

  const activeTab: DashboardTab = validTabs.includes(raw as DashboardTab)
    ? (raw as DashboardTab)
    : "overview";

  return <WorkspaceClient activeTab={activeTab} />;
}