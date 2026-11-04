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

// Thin strips along each edge, with a small pill in the middle as the visible
// affordance. Wide hit areas on touch devices.
const EDGE_HANDLES: Record<
  "n" | "s" | "e" | "w",
  { strip: string; pill: string }
> = {
  n: {
    strip:
      "left-3 right-3 top-0 h-3 -translate-y-1/2 cursor-ns-resize pointer-coarse:h-6",
    pill: "h-1 w-6",
  },
  s: {
    strip:
      "bottom-0 left-3 right-3 h-3 translate-y-1/2 cursor-ns-resize pointer-coarse:h-6",
    pill: "h-1 w-6",
  },
  w: {
    strip:
      "bottom-3 left-0 top-3 w-3 -translate-x-1/2 cursor-ew-resize pointer-coarse:w-6",
    pill: "h-6 w-1",
  },
  e: {
    strip:
      "bottom-3 right-0 top-3 w-3 translate-x-1/2 cursor-ew-resize pointer-coarse:w-6",
    pill: "h-6 w-1",
  },
};

const CORNERS = Object.keys(CORNER_HANDLES) as (keyof typeof CORNER_HANDLES)[];
const EDGES = Object.keys(EDGE_HANDLES) as (keyof typeof EDGE_HANDLES)[];

interface AnnotationBoxProps {
  annotation: Annotation;
  position: AnnotationPosition;
  selected: boolean;
  disabled: boolean;
  scale: number;
  /** Set while this box is being dragged, so it can show a live readout. */
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
  const fontSize = (annotation.style.fontSize ?? BASE_FONT_SIZE) * scale;

  const editable = selected && !disabled;
  const isCheckbox = annotation.type === "checkbox";

  const showMoveGrip =
    editable && (annotation.type === "text" || annotation.type === "date");

  // Near the top of the page the label would be clipped, so flip it below.
  const labelBelow = position.y < 6;

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
      className={`absolute outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand ${
        disabled ? "cursor-default" : "cursor-move"
      } ${
        selected
          ? "ring-2 ring-brand"
          : disabled
            ? ""
            : "hover:ring-1 hover:ring-brand/50"
      }`}
    >
      <div
        style={{
          fontSize,
          fontFamily: annotation.style.fontFamily ?? "inherit",
          color: annotation.style.color ?? "#111827",
          textAlign: annotation.style.textAlign ?? "left",
          backgroundColor: isCheckbox
            ? "transparent"
            : (annotation.style.backgroundColor ?? "rgba(59,130,246,0.08)"),
          borderColor: annotation.style.borderColor ?? "rgba(59,130,246,0.5)",
          borderWidth: annotation.style.borderWidth ?? 1,
        }}
        className="absolute inset-0 flex items-center overflow-hidden border"
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

      {annotation.required && !selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white"
        >
          *
        </span>
      )}

      {editable && !dragging && (
        <span
          className={`pointer-events-none absolute left-0 whitespace-nowrap rounded bg-brand px-1.5 py-0.5 text-[11px] font-medium leading-none text-white ${
            labelBelow ? "top-full mt-1.5" : "-top-6"
          }`}
        >
          {TYPE_LABEL[annotation.type]}
          {annotation.required ? " · Required" : ""}
        </span>
      )}

      {editable && dragging && (
        <span
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums text-white ${
            labelBelow ? "top-full mt-2" : "-top-7"
          }`}
        >
          {dragging === "resize"
            ? `${position.width.toFixed(1)}% × ${position.height.toFixed(1)}%`
            : `${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%`}
        </span>
      )}

      {showMoveGrip && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Move annotation"
          onPointerDown={(event) => onPointerDown(event, "move")}
          className="absolute left-0 top-0 z-10 h-3 w-3 cursor-move rounded-br-sm border border-white bg-brand before:absolute before:-inset-2 before:content-[''] pointer-coarse:h-6 pointer-coarse:w-6 pointer-coarse:before:-inset-1"
        />
      )}

      {editable &&
        !isCheckbox &&
        EDGES.map((handle) => (
          <button
            key={handle}
            type="button"
            tabIndex={-1}
            aria-label={`Resize ${handle === "n" ? "top" : handle === "s" ? "bottom" : handle === "w" ? "left" : "right"} edge`}
            onPointerDown={(event) => onPointerDown(event, "resize", handle)}
            className={`absolute z-10 flex items-center justify-center ${EDGE_HANDLES[handle].strip}`}
          >
            <span
              className={`rounded-full border border-white bg-brand ${EDGE_HANDLES[handle].pill}`}
            />
          </button>
        ))}

      {editable &&
        CORNERS.map((handle) => (
          <button
            key={handle}
            type="button"
            tabIndex={-1}
            aria-label={`Resize ${handle} corner`}
            onPointerDown={(event) => onPointerDown(event, "resize", handle)}
            className={`absolute z-20 h-3 w-3 rounded-sm border border-white bg-brand before:absolute before:-inset-2 before:content-[''] pointer-coarse:h-5 pointer-coarse:w-5 pointer-coarse:before:-inset-1 ${CORNER_HANDLES[handle]}`}
          />
        ))}
    </div>
  );
}
