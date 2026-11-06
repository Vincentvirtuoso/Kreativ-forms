"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

import type { DocumentPage } from "@/features/documents/domain/document.types";

import { PdfDocumentViewer } from "./PdfDocumentViewer";

interface PreviewDialogProps {
  documentId: string;
  documentName: string;
  /** The working PDF. */
  blob: Blob;
  /** Pages in display order. */
  pages: DocumentPage[];
  /** 1-based page to open on. */
  initialPage: number;
  onClose: () => void;
}

const noop = () => {};
const noopAsync = async () => {};

/**
 * Full-screen, read-only view of the finished document: the PDF with the
 * current annotations drawn on it and none of the editing chrome. It reads the
 * live annotation store, so unsaved edits show up too.
 */
export function PreviewDialog({
  documentId,
  documentName,
  blob,
  pages,
  initialPage,
  onClose,
}: PreviewDialogProps) {
  const [pageNumber, setPageNumber] = useState(initialPage);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const page = pages[pageNumber - 1];

  if (!page) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${documentName}`}
      className="fixed inset-0 z-50 flex flex-col bg-background text-text"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{documentName}</p>
          <p className="text-xs text-text-muted">Preview · read-only</p>
        </div>

        <Button
          type="button"
          size="sm"
          iconOnly
          variant="ghost"
          color="neutral"
          autoFocus
          onClick={onClose}
          aria-label="Close preview"
          className="shrink-0 text-text-muted hover:text-text"
        >
          <X size={18} />
        </Button>
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
