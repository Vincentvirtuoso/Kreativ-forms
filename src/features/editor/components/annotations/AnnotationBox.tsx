"use client";

import type {
  Annotation,
  AnnotationPosition,
} from "../../domain/annotation.types";
import { AnnotationContent } from "./AnnotationContent";
import { BASE_FONT_SIZE } from "../../utils/annotation-overlay.constants";

interface AnnotationBoxProps {
  annotation: Annotation;
  position: AnnotationPosition;
  selected: boolean;
  disabled: boolean;
  scale: number;
  onPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    mode: "move" | "resize",
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
  onPointerDown,
  onKeyDown,
  onChange,
  onRequestSign,
}: AnnotationBoxProps) {
  const fontSize = (annotation.style.fontSize ?? BASE_FONT_SIZE) * scale;

  const showMoveGrip =
    selected &&
    !disabled &&
    (annotation.type === "text" || annotation.type === "date");

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
        fontSize,
        fontFamily: annotation.style.fontFamily ?? "inherit",
        color: annotation.style.color ?? "#111827",
        textAlign: annotation.style.textAlign ?? "left",
        backgroundColor:
          annotation.type === "checkbox"
            ? "transparent"
            : (annotation.style.backgroundColor ?? "rgba(59,130,246,0.08)"),
        borderColor: selected
          ? "var(--color-kui-brand)"
          : (annotation.style.borderColor ?? "rgba(59,130,246,0.5)"),
        borderWidth: selected ? 2 : (annotation.style.borderWidth ?? 1),
        touchAction: "none",
      }}
      className={`absolute flex items-center overflow-hidden border outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        disabled ? "cursor-default" : "cursor-move"
      } ${selected ? "ring-2 ring-brand/20" : ""}`}
    >
      <div
        className={`flex h-full w-full items-center ${
          selected && !disabled ? "" : "pointer-events-none"
        }`}
      >
        <AnnotationContent
          annotation={annotation}
          disabled={disabled}
          onChange={onChange}
          onRequestSign={onRequestSign}
        />
      </div>

      {showMoveGrip && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Move annotation"
          onPointerDown={(event) => onPointerDown(event, "move")}
          className="absolute left-0 top-0 z-10 h-3 w-3 cursor-move rounded-br-sm border border-white bg-brand before:absolute before:-inset-2 before:content-[''] pointer-coarse:h-6 pointer-coarse:w-6 pointer-coarse:before:-inset-1"
        />
      )}

      {selected && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Resize annotation"
          onPointerDown={(event) => onPointerDown(event, "resize")}
          className="absolute bottom-0 right-0 z-10 h-3 w-3 cursor-nwse-resize rounded-tl-sm border border-white bg-brand before:absolute before:-inset-2 before:content-[''] pointer-coarse:h-6 pointer-coarse:w-6 pointer-coarse:before:-inset-1"
        />
      )}
    </div>
  );
}
