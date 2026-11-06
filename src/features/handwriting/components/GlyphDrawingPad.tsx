"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

import { GLYPH_VIEWBOX, type StrokePoint } from "../domain/handwriting.types";
import { Button } from "@splenddev/kreativ-ui/components";
import { Redo2, TriangleAlert, Undo2, X } from "lucide-react";
import { checkGlyphSize, GUIDE_LINES } from "../utils/glyph-metrics";
import { useKeyboardShortcuts } from "@splenddev/kreativ-ui";
import { composeRefs } from "@/utils/composeRefs";
import { cn } from "@/lib/cn";

interface GlyphDrawingPadProps {
  strokes: StrokePoint[][];
  onChange: (strokes: StrokePoint[][]) => void;
  disabled?: boolean;
  /** Character being captured. Shown as a faint tracing hint while empty. */
  character?: string;
}

type PointerEvent = KonvaEventObject<globalThis.PointerEvent>;

const GUIDES = [
  {
    y: GUIDE_LINES.ascender,
    label: "Ascender",
    color: "#e5e7eb",
    dash: [4, 6],
  },
  { y: GUIDE_LINES.xHeight, label: "x-height", color: "#e5e7eb", dash: [4, 6] },
  {
    y: GUIDE_LINES.baseline,
    label: "Baseline",
    color: "#a1a1aa",
    dash: [5, 5],
  },
  {
    y: GUIDE_LINES.descender,
    label: "Descender",
    color: "#e5e7eb",
    dash: [4, 6],
  },
] as const;

const BASELINE_Y = GUIDE_LINES.baseline;
const CAP_HEIGHT = BASELINE_Y - GUIDE_LINES.ascender;

const WARNING_COLOR = "#f59e0b";

/** Ignore pointer jitter smaller than this, in glyph units. */
const MIN_POINT_DISTANCE = 0.75;

export function GlyphDrawingPad({
  strokes,
  onChange,
  disabled = false,
  character,
}: GlyphDrawingPadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeStrokeRef = useRef<StrokePoint[]>([]);
  const drawingRef = useRef(false);

  const [width, setWidth] = useState(600);
  const [activeStroke, setActiveStroke] = useState<StrokePoint[]>([]);
  // State, not a ref, so the Redo button enables and disables correctly.
  const [redoStack, setRedoStack] = useState<StrokePoint[][]>([]);

  const height = (width * GLYPH_VIEWBOX.height) / GLYPH_VIEWBOX.width;
  const unit = height / 700;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, entry.contentRect.width));
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const getCanonicalPoint = useCallback(
    (event: PointerEvent): StrokePoint | null => {
      const stage = event.target.getStage();
      const point = stage?.getPointerPosition();

      if (!point) return null;

      const nativeEvent = event.evt;

      const pressure =
        nativeEvent.pointerType === "mouse"
          ? 0.5
          : nativeEvent.pressure > 0
            ? nativeEvent.pressure
            : 0.5;

      return [
        Math.max(
          0,
          Math.min(
            GLYPH_VIEWBOX.width,
            (point.x / width) * GLYPH_VIEWBOX.width,
          ),
        ),
        Math.max(
          0,
          Math.min(
            GLYPH_VIEWBOX.height,
            (point.y / height) * GLYPH_VIEWBOX.height,
          ),
        ),
        pressure,
      ];
    },
    [width, height],
  );

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const completed = activeStrokeRef.current;

    if (completed.length > 0) {
      setRedoStack([]);
      onChange([...strokes, completed]);
    }

    activeStrokeRef.current = [];
    setActiveStroke([]);
  }, [onChange, strokes]);

  const handlePointerDown = (event: PointerEvent) => {
    if (disabled || drawingRef.current) return;

    event.evt.preventDefault();

    // Keyboard shortcuts only reach an element that has focus, and clicking a
    // canvas doesn't focus its container on its own.
    containerRef.current?.focus({ preventScroll: true });

    const point = getCanonicalPoint(event);
    if (!point) return;

    drawingRef.current = true;
    activeStrokeRef.current = [point];
    setActiveStroke([point]);

    // Keep receiving pointer events if the pointer leaves the pad.
    const target = event.evt.target;

    if (target instanceof Element) {
      try {
        target.setPointerCapture(event.evt.pointerId);
      } catch {
        // Pointer capture may not be supported by the target.
      }
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!drawingRef.current) return;

    event.evt.preventDefault();

    const point = getCanonicalPoint(event);
    if (!point) return;

    const previous = activeStrokeRef.current.at(-1);

    if (
      previous &&
      Math.hypot(point[0] - previous[0], point[1] - previous[1]) <
        MIN_POINT_DISTANCE
    ) {
      return;
    }

    const next = [...activeStrokeRef.current, point];

    activeStrokeRef.current = next;
    setActiveStroke(next);
  };

  const undo = () => {
    if (disabled || !strokes.length) return;

    const lastStroke = strokes[strokes.length - 1];

    setRedoStack((stack) => [...stack, lastStroke]);
    onChange(strokes.slice(0, -1));
  };

  const redo = () => {
    if (disabled) return;

    const nextStroke = redoStack[redoStack.length - 1];
    if (!nextStroke) return;

    setRedoStack(redoStack.slice(0, -1));
    onChange([...strokes, nextStroke]);
  };

  const clear = () => {
    drawingRef.current = false;
    activeStrokeRef.current = [];
    setActiveStroke([]);
    setRedoStack([]);
    onChange([]);
  };

  // The first argument is `enabled`. It was `false`, which made the hook
  // return before attaching its listener.
  const shortcutRef = useKeyboardShortcuts(
    !disabled,
    { "ctrl+z": undo, "ctrl+shift+z": redo, "ctrl+y": redo },
    [undo, redo],
  );

  const composedRef = useMemo(
    () => composeRefs(containerRef, shortcutRef),
    [containerRef, shortcutRef],
  );

  const strokeWidth = Math.max(2.5, width / 200);

  const renderStroke = (stroke: StrokePoint[], index: number) => (
    <Line
      key={index}
      points={stroke.flatMap(([x, y]) => [
        (x / GLYPH_VIEWBOX.width) * width,
        (y / GLYPH_VIEWBOX.height) * height,
      ])}
      stroke="#202020"
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      tension={0.2}
      listening={false}
    />
  );

  const isEmpty = strokes.length === 0 && activeStroke.length === 0;

  // Judge size only between strokes, so the warning doesn't flicker while
  // the user is still drawing.
  const sizeCheck = useMemo(
    () => (character ? checkGlyphSize(character, strokes) : null),
    [character, strokes],
  );

  const sizeWarning =
    sizeCheck?.small && activeStroke.length === 0 ? sizeCheck : null;

  const hintFontSize = (CAP_HEIGHT / 0.72) * unit;

  return (
    <div className="space-y-3">
      <div
        ref={composedRef}
        tabIndex={disabled ? -1 : 0}
        role="application"
        aria-label={
          character ? `Drawing area for ${character}` : "Glyph drawing area"
        }
        aria-keyshortcuts="Control+Z Control+Shift+Z Control+Y"
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-white outline-none transition-shadow",
          "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair",
        )}
        style={{ touchAction: "none" }}
      >
        <Stage
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        >
          <Layer>
            <Rect
              width={width}
              height={height}
              fill="white"
              listening={false}
            />

            {GUIDES.map((guide) => (
              <Line
                key={guide.label}
                points={[0, guide.y * unit, width, guide.y * unit]}
                stroke={guide.color}
                dash={[...guide.dash]}
                listening={false}
              />
            ))}

            {/* Faint tracing hint, only until the first stroke. */}
            {isEmpty && character && (
              <Text
                text={character}
                width={width}
                align="center"
                y={BASELINE_Y * unit - hintFontSize * 0.82}
                fontSize={hintFontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="#000000"
                opacity={0.06}
                listening={false}
              />
            )}

            {strokes.map(renderStroke)}
            {activeStroke.length > 0 && renderStroke(activeStroke, -1)}

            {/* Outline what was drawn when it came out too small. */}
            {sizeWarning?.bounds && (
              <Rect
                x={(sizeWarning.bounds.minX / GLYPH_VIEWBOX.width) * width - 8}
                y={sizeWarning.bounds.minY * unit - 8}
                width={
                  ((sizeWarning.bounds.maxX - sizeWarning.bounds.minX) /
                    GLYPH_VIEWBOX.width) *
                    width +
                  16
                }
                height={
                  (sizeWarning.bounds.maxY - sizeWarning.bounds.minY) * unit +
                  16
                }
                stroke={WARNING_COLOR}
                strokeWidth={1.5}
                dash={[5, 4]}
                cornerRadius={6}
                listening={false}
              />
            )}

            {/* Guide labels sit on top so strokes never hide them. */}
            {GUIDES.map((guide) => (
              <Text
                key={guide.label}
                text={guide.label}
                x={8}
                y={guide.y * unit - 14}
                fontSize={10}
                fill="#a1a1aa"
                listening={false}
              />
            ))}
          </Layer>
        </Stage>

        {/* Sits in the empty strip under the descender line, so it neither
            covers the drawing nor shifts the layout when it appears. */}
        {sizeWarning?.message && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full border border-warning/50 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-text shadow-sm"
          >
            <TriangleAlert size={12} className="shrink-0 text-warning" />
            {sizeWarning.message}
          </div>
        )}

        <p role="status" className="sr-only">
          {sizeWarning?.message ?? ""}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tabular-nums text-text-muted">
            {strokes.length} {strokes.length === 1 ? "stroke" : "strokes"}
          </p>

          <p className="hidden text-[11px] text-text-muted/80 sm:block pointer-coarse:hidden">
            Ctrl/⌘+Z undo · Ctrl/⌘+Shift+Z redo
          </p>
        </div>

        <div className="flex gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            disabled={!strokes.length || disabled}
            onClick={undo}
            aria-label="Undo"
          >
            <Undo2 size={14} />
            Undo
          </Button>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            disabled={!redoStack.length || disabled}
            onClick={redo}
            aria-label="Redo"
          >
            <Redo2 size={14} />
            Redo
          </Button>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            color="destructive"
            disabled={!strokes.length || disabled}
            onClick={clear}
            aria-label="Clear drawing"
          >
            <X size={14} />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
