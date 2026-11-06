"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DocumentPage } from "@/features/documents/domain/document.types";
import { headerHeight } from "../utils/editor-constants";

interface PagesPanelProps {
  pages: DocumentPage[];
  selectedPage: number;
  onSelectPage: (pageNumber: number) => void;
  thumbnailUrls: Record<string, string>;
}

export function PagesPanel({
  pages,
  selectedPage,
  onSelectPage,
  thumbnailUrls,
}: PagesPanelProps) {
  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-surface">
      <div
        className={cn("border-b border-border px-3 py-3")}
        style={{ height: headerHeight }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Pages
        </h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {pages.map((page, index) => {
          const isActive = selectedPage === index + 1;
          const thumbnail = page.thumbnailAssetId
            ? thumbnailUrls[page.thumbnailAssetId]
            : undefined;

          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelectPage(index + 1)}
              className={`w-full rounded-lg border p-2 text-left transition-colors ${
                isActive
                  ? "border-brand bg-brand/5"
                  : "border-border hover:bg-surface-raised"
              }`}
            >
              <div className="flex aspect-3/4 items-center justify-center overflow-hidden rounded bg-surface-sunken">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={`Page ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <FileText className="h-8 w-8 text-text-muted" />
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium">Page {index + 1}</span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
