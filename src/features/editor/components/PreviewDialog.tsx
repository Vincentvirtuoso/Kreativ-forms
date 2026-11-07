"use client";

import { useEffect, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

import { cn } from "@/lib/cn";

import type { DocumentPage } from "@/features/documents/domain/document.types";

import { PdfDocumentViewer } from "./PdfDocumentViewer";

interface PreviewDialogProps {
  documentId: string;
  documentName: string;
  blob: Blob;
  pages: DocumentPage[];
  initialPage: number;
  onClose: () => void;
  onExport: (pageIds?: string[]) => Promise<void>;
}
type ExportMode = "all" | "current" | "selected";

const noop = () => {};
const noopAsync = async () => {};
function togglePageSelection(pageId: string) {
  setSelectedPageIds((current) =>
    current.includes(pageId)
      ? current.filter((id) => id !== pageId)
      : [...current, pageId],
  );
}

export function PreviewDialog({
  documentId,
  documentName,
  blob,
  pages,
  initialPage,
  onClose,
  onExport,
}: PreviewDialogProps) {
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>("all");

const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleExport() {
  try {
    setIsExporting(true);
    setExportError(null);

    const pageIds =
      exportMode === "all"
        ? undefined
        : exportMode === "current"
          ? [page.id]
          : selectedPageIds;

    if (exportMode === "selected" && !selectedPageIds.length) {
      throw new Error("Select at least one page to export.");
    }

    await onExport(pageIds);
  } catch (error) {
    setExportError(
      error instanceof Error ? error.message : "Failed to export PDF.",
    );
  } finally {
    setIsExporting(false);
  }
}

  const page = pages[pageNumber - 1];

  if (!page) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${documentName}`}
      className="absolute inset-0 z-40 flex flex-col bg-background text-text"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{documentName}</p>
          <p className="text-xs text-text-muted">Preview · read-only</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            iconOnly
            variant="ghost"
            color="neutral"
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 text-text-muted hover:text-text"
          >
            <X size={18} />
          </Button>
        </div>
      </div>
<div className="flex flex-col gap-3 border-t border-border p-3">
  <p className="text-sm font-medium">Export pages</p>

  <div className="flex flex-wrap gap-2">
    {([
      ["all", "All pages"],
      ["current", "Current page"],
      ["selected", "Selected pages"],
    ] as const).map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() => setExportMode(value)}
        className={cn(
          "rounded-md border px-3 py-1.5 text-xs transition-colors",
          exportMode === value
            ? "border-foreground bg-surface-muted text-foreground"
            : "border-border text-text-muted hover:bg-surface-muted",
        )}
      >
        {label}
      </button>
    ))}
  </div>

  {exportMode === "selected" && (
    <div className="grid grid-cols-4 gap-2">
      {pages.map((item, index) => (
        <label
          key={item.id}
          className="flex items-center gap-2 rounded-md border border-border p-2 text-xs"
        >
          <input
            type="checkbox"
            checked={selectedPageIds.includes(item.id)}
            onChange={() => togglePageSelection(item.id)}
          />
          Page {index + 1}
        </label>
      ))}
    </div>
  )}
</div>

      <PdfDocumentViewer
        blob={blob}
        pageCount={pages.length}
        pageNumber={pageNumber}
        onPageChange={setPageNumber}
        pageId={page.id}
        documentId={documentId}
        onAnnotationDelete={noopAsync}
        onAnnotationUpdate={noop}
        previewMode
      />
    </div>
  );
}
