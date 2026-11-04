import { DocumentsWorkspace } from "@/features/dashboard/components/DocumentsWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

export default function DashboardPage() {
  return <DocumentsWorkspace />;
}
