"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

import { cn } from "@/lib/cn";

import type { DocumentPage } from "@/features/documents/domain/document.types";

import { PdfDocumentViewer } from "./PdfDocumentViewer";
import { ExportDialog } from "./ExportDialog";
import { ExportOptions } from "@/features/documents/services/pdf-export.service";

interface PreviewDialogProps {
  documentId: string;
  documentName: string;
  blob: Blob;
  pages: DocumentPage[];
  initialPage: number;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

type ExportMode = "all" | "current" | "selected";

const noop = () => {};
const noopAsync = async () => {};

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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const orderedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );

  const page = orderedPages[pageNumber - 1];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isExporting) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, isExporting]);

  function togglePageSelection(pageId: string) {
    setSelectedPageIds((current) =>
      current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId],
    );
  }

  async function handleExport() {
    if (isExporting || !page) return;

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

      await onExport({ pageIds });
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Failed to export PDF.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (!page) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${documentName}`}
      className="absolute inset-0 z-40 flex flex-col bg-background text-text"
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{documentName}</p>

          <p className="text-xs text-text-muted">Preview · read-only</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download size={16} />
            <span>Export PDF</span>
          </Button>

          <Button
            type="button"
            size="sm"
            iconOnly
            variant="ghost"
            color="neutral"
            disabled={isExporting}
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 text-text-muted hover:text-text"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Export options */}
      <ExportDialog
        open={exportDialogOpen}
        documentName={documentName}
        pages={orderedPages}
        currentPageId={page.id}
        onClose={() => setExportDialogOpen(false)}
        onExport={onExport}
      />
      {/* PDF viewer */}
      <div className="min-h-0 flex-1">
        <PdfDocumentViewer
          blob={blob}
          pageCount={orderedPages.length}
          pageNumber={pageNumber}
          onPageChange={setPageNumber}
          pageId={page.id}
          documentId={documentId}
          onAnnotationDelete={noopAsync}
          onAnnotationUpdate={noop}
          previewMode
        />
      </div>
    </div>
  );
}
