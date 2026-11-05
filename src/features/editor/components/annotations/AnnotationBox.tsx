
"use client";

import type {
  Annotation,
  AnnotationPosition,
} from "../../domain/annotation.types";
import { AnnotationContent } from "./AnnotationContent";
import { BASE_FONT_SIZE } from "../../utils/annotation-overlay.constants";
import type { ResizeHandle } from "../../utils/annotation-geometry";

const TYPE_LABEL: Record<Annotation["type"], string> = {
  text: "Text",
  date: "Date",
  checkbox: "Checkbox",
  signature: "Signature",
};

const CORNER_HANDLES: Record<"nw" | "ne" | "sw" | "se", string> = {
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
};

const EDGE_HANDLES: Record<
  "n" | "s" | "e" | "w",
  string
> = {
  n: "left-1/2 top-0 h-2 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  s: "bottom-0 left-1/2 h-2 w-8 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  w: "left-0 top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  e: "right-0 top-1/2 h-8 w-2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
};

const CORNERS = Object.keys(CORNER_HANDLES) as (
  keyof typeof CORNER_HANDLES
)[];

const EDGES = Object.keys(EDGE_HANDLES) as (
  keyof typeof EDGE_HANDLES
)[];

interface AnnotationBoxProps {
  annotation: Annotation;
  position: AnnotationPosition;
  selected: boolean;
  disabled: boolean;
  scale: number;
  dragging?: "move" | "resize" | null;
  onPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    mode: "move" | "resize",
    handle?: ResizeHandle,
  ) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onChange: (value: string | boolean) => void;
  onRequestSign: () => void;
}

export function AnnotationBox({
  annotation,
  position,
  selected,
  disabled,
  scale,
  dragging = null,
  onPointerDown,
  onKeyDown,
  onChange,
  onRequestSign,
}: AnnotationBoxProps) {
  const fontSize =
    (annotation.style.fontSize ?? BASE_FONT_SIZE) * scale;

  const editable = selected && !disabled;
  const isCheckbox = annotation.type === "checkbox";

  const showMoveGrip =
    editable &&
    (annotation.type === "text" || annotation.type === "date");

  const labelBelow = position.y < 6;

  const isInteracting = dragging !== null;

  return (
    <div
      data-annotation-id={annotation.id}
      role="group"
      tabIndex={0}
      aria-label={`${annotation.type} annotation`}
      data-selected={selected}
      onPointerDown={(event) => onPointerDown(event, "move")}
      onKeyDown={onKeyDown}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        zIndex: selected ? 20 : 1,
        touchAction: "none",
      }}
      className={[
        "absolute outline-none",
        disabled ? "cursor-default" : "cursor-move",
        selected && !isInteracting
          ? "after:pointer-events-none after:absolute after:inset-0 after:border after:border-brand after:content-['']"
          : "",
        selected && isInteracting
          ? "after:pointer-events-none after:absolute after:inset-0 after:border after:border-brand after:content-['']"
          : "",
        !selected && !disabled
          ? "hover:after:pointer-events-none hover:after:absolute hover:after:inset-0 hover:after:border hover:after:border-brand/50 hover:after:content-['']"
          : "",
        "focus-visible:ring-1 focus-visible:ring-brand focus-visible:ring-offset-1",
      ].join(" ")}
    >
      {/* Annotation content */}
      <div
        style={{
          fontSize,
          fontFamily: annotation.style.fontFamily ?? "inherit",
          color: annotation.style.color ?? "#111827",
          textAlign: annotation.style.textAlign ?? "left",
          backgroundColor: isCheckbox
            ? "transparent"
            : (
                annotation.style.backgroundColor ??
                "rgba(59,130,246,0.04)"
              ),
          borderColor: annotation.style.borderColor ?? "transparent",
          borderWidth: annotation.style.borderWidth ?? 0,
        }}
        className="absolute inset-0 flex items-center overflow-hidden"
      >
        <div
          className={`flex h-full w-full items-center ${
            editable ? "" : "pointer-events-none"
          }`}
        >
          <AnnotationContent
            annotation={annotation}
            disabled={disabled}
            onChange={onChange}
            onRequestSign={onRequestSign}
          />
        </div>
      </div>

      {/* Required indicator */}
      {annotation.required && selected && (
        <span
          className="pointer-events-none absolute -right-1 -top-1 z-30 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
          aria-label="Required"
        />
      )}

      {/* Contextual selection toolbar */}
      {editable && (
        <div
          className={[
            "pointer-events-none absolute left-0 z-30",
            "flex items-center gap-2",
            "whitespace-nowrap rounded-md border border-border",
            "bg-background/95 px-2 py-1 shadow-lg backdrop-blur-sm",
            "transition-opacity",
            labelBelow ? "top-full mt-3" : "-top-9",
            isInteracting ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <span className="text-[10px] font-semibold tracking-wide text-text">
            {TYPE_LABEL[annotation.type].toUpperCase()}
          </span>

          {annotation.required && (
            <>
              <span className="h-3 w-px bg-border" />
              <span className="text-[10px] text-text-muted">
                Required
              </span>
            </>
          )}
        </div>
      )}

      {/* Live measurement */}
      {editable && isInteracting && (
        <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-3 -translate-x-1/2">
          <div className="whitespace-nowrap rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium tabular-nums text-text shadow-lg">
            {dragging === "resize"
              ? `${position.width.toFixed(1)}% × ${position.height.toFixed(1)}%`
              : `${position.x.toFixed(1)}% · ${position.y.toFixed(1)}%`}
          </div>
        </div>
      )}

      {/* Move grip */}
      {showMoveGrip && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Move annotation"
          onPointerDown={(event) => onPointerDown(event, "move")}
          className={[
            "absolute left-0 top-0 z-40",
            "h-2 w-2 -translate-x-1/2 -translate-y-1/2",
            "cursor-move border border-brand bg-background",
            "shadow-sm",
            "before:absolute before:-inset-2 before:content-['']",
            "pointer-coarse:h-4 pointer-coarse:w-4",
          ].join(" ")}
        />
      )}

      {/* Edge resize handles */}
      {editable && !isCheckbox &&
        EDGES.map((handle) => (
          <button
            key={handle}
            type="button"
            tabIndex={-1}
            aria-label={`Resize ${handle} edge`}
            onPointerDown={(event) =>
              onPointerDown(event, "resize", handle)
            }
            className={[
              "absolute z-40 flex items-center justify-center",
              EDGE_HANDLES[handle],
              "before:absolute before:-inset-2 before:content-['']",
            ].join(" ")}
          >
            <span className="h-1 w-4 rounded-full border border-brand/60 bg-background shadow-sm" />
          </button>
        ))}

      {/* Corner resize handles */}
      {editable && !isCheckbox &&
        CORNERS.map((handle) => (
          <button
            key={handle}
            type="button"
            tabIndex={-1}
            aria-label={`Resize ${handle} corner`}
            onPointerDown={(event) =>
              onPointerDown(event, "resize", handle)
            }
            className={[
              "absolute z-50",
              "h-2 w-2 border border-brand",
              "bg-background shadow-sm",
              "before:absolute before:-inset-2 before:content-['']",
              "pointer-coarse:h-3 pointer-coarse:w-3",
              CORNER_HANDLES[handle],
            ].join(" ")}
          />
        ))}
    </div>
  );
}
