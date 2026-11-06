"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Check, Eraser, SavePen, SavePlus, Undo2, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

import ColorPicker from "@/components/ui/color-picker";
import { Modal } from "@/components/ui/modal";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_PEN,
  PenSettings,
  type SignaturePoint,
  type SignatureStroke,
} from "../../editor/utils/signature-geometry";
import {
  createBaseLayer,
  exportSignature,
  paintSignature,
  type BaseLayer,
} from "../../editor/utils/signature-export";

export type { SignatureDrawing } from "../../editor/utils/signature-export";
import type { SignatureDrawing } from "../../editor/utils/signature-export";
import { PenControls } from "../../editor/components/annotations/PenControls";

interface SignaturePadProps {
  initialValue?: string | null;
  onSave?: (signature: string) => void;
  onSaveDrawing?: (drawing: SignatureDrawing) => void;
  onCancel: () => void;
  onSaveToLibrary?: (drawing: SignatureDrawing) => void;
}

/** Ignore pointer jitter smaller than this (logical units). */
const MIN_POINT_DISTANCE = 0.8;

export function SignaturePad({
  initialValue,
  onSave,
  onCancel,
  onSaveDrawing,
  onSaveToLibrary,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const activeStrokeRef = useRef<SignatureStroke | null>(null);
  const baseLayerRef = useRef<BaseLayer | null>(null);

  const [pen, setPen] = useState<PenSettings>(DEFAULT_PEN);
  const [hasInk, setHasInk] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(pen.color);

  const render = useCallback(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    paintSignature(
      context,
      strokesRef.current,
      baseLayerRef.current,
      activeStrokeRef.current,
    );
  }, []);

  const syncState = useCallback(() => {
    setHasInk(Boolean(baseLayerRef.current) || strokesRef.current.length > 0);
    setCanUndo(strokesRef.current.length > 0);
  }, []);

  useEffect(() => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    baseLayerRef.current = null;

    render();
    syncState();

    if (!initialValue) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      baseLayerRef.current = createBaseLayer(image);
      render();
      syncState();
    };

    image.onerror = () => {
      console.error("Failed to load existing signature.");
    };

    image.src = initialValue;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [initialValue, render, syncState]);

  function toPoint(event: PointerEvent): SignaturePoint {
    const bounds = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
      pressure:
        event.pointerType === "pen" && event.pressure > 0
          ? event.pressure
          : 0.5,
    };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const stroke: SignatureStroke = {
      points: [toPoint(event.nativeEvent)],
      hasPressure: event.pointerType === "pen",
      color: pen.color,
      size: pen.size,
    };

    strokesRef.current.push(stroke);
    activeStrokeRef.current = stroke;

    render();
    syncState();
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;

    event.preventDefault();

    const native = event.nativeEvent;
    const coalesced = native.getCoalescedEvents?.();
    const samples = coalesced && coalesced.length > 0 ? coalesced : [native];

    let added = false;

    for (const sample of samples) {
      const point = toPoint(sample);
      const previous = stroke.points[stroke.points.length - 1];

      if (
        Math.hypot(point.x - previous.x, point.y - previous.y) <
        MIN_POINT_DISTANCE
      ) {
        continue;
      }

      stroke.points.push(point);
      added = true;
    }

    if (added) render();
  }

  function finishStroke() {
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current = null;
    render();
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishStroke();
  }

  function undo() {
    strokesRef.current.pop();
    activeStrokeRef.current = null;
    render();
    syncState();
  }

  function clear() {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    baseLayerRef.current = null;
    render();
    syncState();
  }

  function handleSave() {
    const drawing = exportSignature(strokesRef.current, baseLayerRef.current);
    if (!drawing) return;

    if (onSaveDrawing) {
      onSaveDrawing(drawing);
      return;
    }
    onSave?.(drawing.png);
  }

  function handleSaveToLibrary() {
    if (!onSaveToLibrary) return;

    const drawing = exportSignature(strokesRef.current, baseLayerRef.current);

    if (!drawing) return;

    onSaveToLibrary(drawing);
  }

  function openColorPicker() {
    setDraftColor(pen.color);
    setColorPickerOpen(true);
  }

  function applyCustomColor() {
    setPen((prev) => ({ ...prev, color: draftColor }));
    setColorPickerOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-border bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="Draw your signature"
          className="block w-full cursor-crosshair touch-none"
          style={{ aspectRatio: "10 / 3" }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={finishStroke}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium tracking-wide text-text-muted/70">
              Draw your signature here
            </span>
          </div>
        )}
      </div>

      <PenControls
        pen={pen}
        onChange={setPen}
        onRequestCustomColor={openColorPicker}
      />

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            disabled={!canUndo}
            iconOnly
            onClick={undo}
          >
            <Undo2 size={15} />
            <span className="sr-only">Undo</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            iconOnly
            color="neutral"
            disabled={!hasInk}
            onClick={clear}
          >
            <Eraser size={15} />
            <span className="sr-only">Clear</span>
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            color="neutral"
            onClick={onCancel}
          >
            <X size={16} />
            Cancel
          </Button>
          {onSaveToLibrary && (
            <Button
              type="button"
              variant="outline"
              color="neutral"
              disabled={!hasInk}
              onClick={handleSaveToLibrary}
              title="s"
            >
              <SavePlus />
              <span className="hidden sm:block">Save to Library</span>
            </Button>
          )}
          <Button type="button" disabled={!hasInk} onClick={handleSave}>
            <Check size={15} />
            <span className="hidden sm:block">Use signature</span>
          </Button>
        </div>
      </div>

      <Modal
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        title="Custom pen color"
        description="Pick a color to draw with. Only new strokes are affected."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              onClick={() => setColorPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyCustomColor}>
              Use color
            </Button>
          </>
        }
      >
        <ColorPicker
          value={draftColor}
          onChange={(value) => setDraftColor(value.hex)}
          showAlpha={false}
        />
      </Modal>
    </div>
  );
}
