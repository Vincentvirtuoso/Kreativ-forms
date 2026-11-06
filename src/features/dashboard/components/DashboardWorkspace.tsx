import type { DashboardTab } from "../dashboard.types";
import { AssetsView } from "../views/AssetsView";
import { OverviewView } from "../views/OverviewView";
import { SettingsView } from "../views/SettingsView";
import { UploadedView } from "../views/UploadedView";

import { DashboardNavigation } from "./DashboardNavigation";

interface DashboardWorkspaceProps {
  activeTab: DashboardTab;
}

export function DashboardWorkspace({ activeTab }: DashboardWorkspaceProps) {
  return (
    <div className="space-y-6 pb-6" data-kui-full-bleed>
      <DashboardNavigation activeTab={activeTab} />

      <div key={activeTab} className="px-4 md:px-6">
        {activeTab === "overview" && <OverviewView />}

        {activeTab === "uploaded" && <UploadedView />}

        {activeTab === "assets" && <AssetsView />}

        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}
