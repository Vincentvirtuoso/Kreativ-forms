"use client";

import dynamic from "next/dynamic";

export const HomeClient = dynamic(
  () => import("./HomePage").then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-raised" />
          <div className="h-8 w-64 animate-pulse rounded bg-surface-raised" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
          <div className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    ),
  },
);