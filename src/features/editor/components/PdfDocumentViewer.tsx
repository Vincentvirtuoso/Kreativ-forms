"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { pdfjsLib } from "@/engines/pdf/pdfjs.client";

import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";
import { AnnotationOverlay } from "./AnnotationOverlay";

import type { AnnotationUpdate } from "../domain/annotation.types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

interface PdfDocumentViewerProps {
  blob: Blob;
  pageCount: number;
  pageNumber: number;
  onPageChange: (page: number) => void;
  onAnnotationDelete: (id: string) => Promise<void>;
  pageId: string;
  documentId: string;
  onAnnotationUpdate: (id: string, update: AnnotationUpdate) => void;
}

export function PdfDocumentViewer({
  blob,
  pageCount,
  pageNumber,
  onPageChange,
  documentId,
  onAnnotationDelete,
  pageId,
  onAnnotationUpdate,
}: PdfDocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);

  const [pageSize, setPageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        setPdf(null);
        setPageSize(null);

        const data = new Uint8Array(await blob.arrayBuffer());

        if (!active) return;

        loadingTask = pdfjsLib.getDocument({ data });

        const loadedPdf = await loadingTask.promise;

        if (!active) {
          await loadingTask.destroy();
          return;
        }

        if (loadedPdf.numPages !== pageCount) {
          throw new Error("PDF page count does not match document metadata.");
        }

        setPdf(loadedPdf);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load this PDF.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPdf();

    return () => {
      active = false;

      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [blob, pageCount]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let active = true;
    let renderTask: ReturnType<PDFPageProxy["render"]> | undefined;

    async function renderPage() {
      try {
        const page = await pdf!.getPage(pageNumber);

        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to initialize PDF canvas.");
        }

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setPageSize({ width: viewport.width, height: viewport.height });

        renderTask = page.render({
          canvasContext: context,
          viewport,
          canvas,
          transform:
            outputScale !== 1
              ? [outputScale, 0, 0, outputScale, 0, 0]
              : undefined,
        });

        await renderTask.promise;
      } catch (err) {
        if (
          active &&
          !(err instanceof Error && err.name === "RenderingCancelledException")
        ) {
          setError(
            err instanceof Error ? err.message : "Unable to render PDF page.",
          );
        }
      }
    }

    setError(null);
    void renderPage();

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, scale]);

  useEffect(() => {
    return () => {
      void pdf?.cleanup();
    };
  }, [pdf]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pageNumber]);

  function changePage(direction: -1 | 1) {
    onPageChange(Math.min(pageCount, Math.max(1, pageNumber + direction)));
  }

  function changeZoom(direction: -1 | 1) {
    setScale((current) =>
      Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, +(current + direction * SCALE_STEP).toFixed(2)),
      ),
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={loading || pageNumber <= 1}
            onClick={() => changePage(-1)}
            className="rounded-md p-2 hover:bg-surface-raised disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="min-w-20 text-center text-sm tabular-nums">
            {pageNumber} / {pageCount}
          </span>

          <button
            type="button"
            aria-label="Next page"
            disabled={loading || pageNumber >= pageCount}
            onClick={() => changePage(1)}
            className="rounded-md p-2 hover:bg-surface-raised disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={scale <= MIN_SCALE}
            onClick={() => changeZoom(-1)}
            className="rounded-md p-2 hover:bg-surface-raised disabled:opacity-30"
          >
            <ZoomOut size={17} />
          </button>

          <span className="min-w-12 text-center text-xs tabular-nums text-text-muted">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            aria-label="Zoom in"
            disabled={scale >= MAX_SCALE}
            onClick={() => changeZoom(1)}
            className="rounded-md p-2 hover:bg-surface-raised disabled:opacity-30"
          >
            <ZoomIn size={17} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative flex min-h-0 min-w-0 flex-1 overflow-auto bg-surface-sunken"
      >
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="absolute inset-x-0 top-4 z-10 text-center text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="m-auto shrink-0 p-6">
          <div
            className="relative bg-background shadow-lg"
            style={
              pageSize
                ? { width: pageSize.width, height: pageSize.height }
                : undefined
            }
          >
            <canvas ref={canvasRef} className="block" />

            <AnnotationOverlay
              pageId={pageId}
              documentId={documentId}
              onUpdate={(id, update) => onAnnotationUpdate(id, update)}
              onDelete={onAnnotationDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
