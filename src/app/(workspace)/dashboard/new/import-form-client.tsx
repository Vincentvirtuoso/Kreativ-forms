"use client";

import dynamic from "next/dynamic";

export const ImportFormClient = dynamic(
  () =>
    import("@/features/documents/import/components/DocumentImportForm").then(
      (m) => ({ default: m.DocumentImportForm }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-xl border border-border bg-surface-raised" />
    ),
  },
);