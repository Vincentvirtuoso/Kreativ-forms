"use client";

import Link from "next/link";
import { LayoutDashboard, Files, Images, Settings2 } from "lucide-react";

import { DASHBOARD_TABS, type DashboardTab } from "../dashboard.types";

const icons = {
  overview: LayoutDashboard,
  uploaded: Files,
  assets: Images,
  settings: Settings2,
};

interface DashboardNavigationProps {
  activeTab: DashboardTab;
}

export function DashboardNavigation({ activeTab }: DashboardNavigationProps) {
  return (
    <nav
      aria-label="Dashboard navigation"
      className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 sticky top-16 bg-background z-10 scrollbar-none"
    >
      {DASHBOARD_TABS.map((tab) => {
        const Icon = icons[tab.id];
        const active = activeTab === tab.id;

        const href =
          tab.id === "overview" ? "/dashboard" : `/dashboard?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? "page" : undefined}
            scroll={false}
            className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
              active ? "text-brand" : "text-text-muted hover:text-text"
            }`}
          >
            <Icon size={16} />
            {tab.label}

            {active && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
