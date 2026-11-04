import type { Metadata } from "next";

import type { DashboardTab } from "@/features/dashboard/dashboard.types";
import { DashboardWorkspace } from "@/features/dashboard/components/DashboardWorkspace";
import { validTabs } from "@/features/dashboard/utils/dashboard.utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const activeTab: DashboardTab = validTabs.includes(tab as DashboardTab)
    ? (tab as DashboardTab)
    : "overview";

  return <DashboardWorkspace activeTab={activeTab} />;
}
