export type DashboardTab = "overview" | "uploaded" | "assets" | "settings";

export const DASHBOARD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "uploaded", label: "Uploaded" },
  { id: "assets", label: "Assets" },
  { id: "settings", label: "Settings" },
] as const satisfies {
  id: DashboardTab;
  label: string;
}[];
