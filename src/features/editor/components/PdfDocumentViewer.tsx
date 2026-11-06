"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

import type {
  Annotation,
  AnnotationPosition,
  AnnotationUpdate,
} from "../domain/annotation.types";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const FIT_PADDING = 32;

const MAX_CANVAS_PIXELS = 16_000_000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function touchDistance(touches: React.TouchList) {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

interface PdfDocumentViewerProps {
  blob: Blob;
  pageCount: number;
  pageNumber: number;
  onPageChange: (page: number) => void;
  onAnnotationDelete: (id: string) => Promise<void>;
  pageId: string;
  documentId: string;
  onAnnotationUpdate: (id: string, update: AnnotationUpdate) => void;
  onAnnotationCreate?: (
    type: Annotation["type"],
    position: AnnotationPosition,
  ) => string | void | Promise<string | void>;
  onAnnotationChangeType?: (
    id: string,
    type: Annotation["type"],
  ) => Promise<void> | void;
  /** Read-only, annotations drawn as the finished result. */
  previewMode?: boolean;
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
  onAnnotationCreate,
  onAnnotationChangeType,
  previewMode = false,
}: PdfDocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pinchStartRef = useRef<number | null>(null);
  const pinchRatioRef = useRef(1);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pinchRatio, setPinchRatio] = useState(1);

  const [pageBase, setPageBase] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ready = !!pageBase && containerWidth > 0;

  const fitScale = pageBase
    ? Math.min(
        1,
        Math.max(0.1, (containerWidth - FIT_PADDING) / pageBase.width),
      )
    : 1;

  const scale = +(fitScale * zoom).toFixed(4);

  const pageSize = useMemo(
    () =>
      pageBase
        ? { width: pageBase.width * scale, height: pageBase.height * scale }
        : null,
    [pageBase, scale],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const update = () => setContainerWidth(element.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        setPdf(null);
        setPageBase(null);

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
    if (!pdf) return;

    let active = true;

    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (!active) return;
        const viewport = page.getViewport({ scale: 1 });
        setPageBase({ width: viewport.width, height: viewport.height });
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to read PDF page.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    if (!pdf || !ready || !canvasRef.current) return;

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

        const outputScale = Math.min(
          window.devicePixelRatio || 1,
          Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)),
        );

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

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
  }, [pdf, pageNumber, scale, ready]);

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
    setZoom((current) =>
      clamp(+(current + direction * ZOOM_STEP).toFixed(2), MIN_ZOOM, MAX_ZOOM),
    );
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchStartRef.current = touchDistance(event.touches);
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (pinchStartRef.current === null || event.touches.length !== 2) return;

    const ratio = clamp(
      touchDistance(event.touches) / pinchStartRef.current,
      MIN_ZOOM / zoom,
      MAX_ZOOM / zoom,
    );

    pinchRatioRef.current = ratio;
    setPinchRatio(ratio);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (pinchStartRef.current === null || event.touches.length >= 2) return;

    const ratio = pinchRatioRef.current;

    pinchStartRef.current = null;
    pinchRatioRef.current = 1;

    setZoom((current) =>
      clamp(+(current * ratio).toFixed(3), MIN_ZOOM, MAX_ZOOM),
    );
    setPinchRatio(1);
  }

  const iconButton =
    "rounded-md p-2 hover:bg-surface-raised disabled:opacity-30 pointer-coarse:p-3";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-2 sm:px-4 pointer-coarse:h-14">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={loading || pageNumber <= 1}
            onClick={() => changePage(-1)}
            className={iconButton}
          >
            <ChevronLeft size={18} />
          </button>

          <span className="min-w-16 text-center text-sm tabular-nums sm:min-w-20">
            {pageNumber} / {pageCount}
          </span>

          <button
            type="button"
            aria-label="Next page"
            disabled={loading || pageNumber >= pageCount}
            onClick={() => changePage(1)}
            className={iconButton}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => changeZoom(-1)}
            className={iconButton}
          >
            <ZoomOut size={17} />
          </button>

          <span className="min-w-12 text-center text-xs tabular-nums text-text-muted">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => changeZoom(1)}
            className={iconButton}
          >
            <ZoomIn size={17} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{ touchAction: "pan-x pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative flex min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-surface-sunken"
      >
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="absolute inset-x-0 top-4 z-10 px-4 text-center text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* Extra bottom padding keeps the page clear of the annotation toolbar. */}
        <div
          className="m-auto shrink-0 p-4 pb-24"
          style={
            pinchRatio !== 1 ? { transform: `scale(${pinchRatio})` } : undefined
          }
        >
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
              scale={scale}
              onUpdate={(id, update) => onAnnotationUpdate(id, update)}
              onDelete={onAnnotationDelete}
              onCreate={onAnnotationCreate}
              onChangeType={onAnnotationChangeType}
              disabled={previewMode}
              previewMode={previewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
