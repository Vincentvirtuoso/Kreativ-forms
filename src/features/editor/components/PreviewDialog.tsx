"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

import type { DocumentPage } from "@/features/documents/domain/document.types";
import type { ExportOptions } from "@/features/export/domain/export.types";

import { PdfDocumentViewer } from "./PdfDocumentViewer";
import { ExportDialog } from "./ExportDialog";

interface PreviewDialogProps {
  documentId: string;
  documentName: string;
  blob: Blob;
  pages: DocumentPage[];
  initialPage: number;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const orderedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );

  const pageCount = orderedPages.length;
  const page = orderedPages[pageNumber - 1];

  // Keep preview navigation valid when the document changes.
  useEffect(() => {
    setPageNumber(Math.min(Math.max(initialPage, 1), Math.max(pageCount, 1)));
  }, [initialPage, pageCount]);

  // Escape closes preview only when the export dialog is closed.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || exportDialogOpen) return;

      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportDialogOpen, onClose]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPageNumber(Math.min(Math.max(nextPage, 1), Math.max(pageCount, 1)));
    },
    [pageCount],
  );

  if (!page) {
    return (
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${documentName}`}
        className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background text-text"
      >
        <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface text-text-muted">
          <Eye size={20} />
        </div>

        <h2 className="mt-4 text-sm font-semibold">Nothing to preview</h2>

        <p className="mt-1 text-xs text-text-muted">
          This document doesn't contain any available pages.
        </p>

        <Button
          type="button"
          size="sm"
          variant="outline"
          color="neutral"
          className="mt-5"
          onClick={onClose}
        >
          Close preview
        </Button>
      </section>
    );
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${documentName}`}
      className="absolute inset-0 z-40 flex min-h-0 flex-col overflow-hidden bg-background text-text"
    >
      <header className="relative z-10 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-text-muted sm:flex">
            <Eye size={17} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{documentName}</h2>

            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
              <span>Preview</span>
              <span aria-hidden="true">·</span>
              <span>Read only</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">Export</span>
          </Button>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

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
      </header>

      <main className="relative min-h-0 flex-1">
        <PdfDocumentViewer
          blob={blob}
          pageCount={pageCount}
          pageNumber={pageNumber}
          onPageChange={handlePageChange}
          pageId={page.id}
          documentId={documentId}
          onAnnotationDelete={noopAsync}
          onAnnotationUpdate={noop}
          previewMode
        />
      </main>

      <ExportDialog
        open={exportDialogOpen}
        documentName={documentName}
        pages={orderedPages}
        currentPageId={page.id}
        onClose={() => setExportDialogOpen(false)}
        onExport={onExport}
      />
    </section>
  );
}
