"use client";

import { useRef, useState } from "react";

import type {
  Annotation,
  AnnotationPosition,
  AnnotationUpdate,
} from "../domain/annotation.types";

import { useAnnotationStore } from "../stores/useAnnotationStore";
import { SignaturePad } from "./SignaturePad";

interface AnnotationOverlayProps {
  pageId: string;
  documentId: string;
  disabled?: boolean;
  onUpdate: (id: string, update: AnnotationUpdate) => void;
  onDelete: (id: string) => void;
}

type DragState = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  initialPosition: AnnotationPosition;
};

const MIN_WIDTH = 2;
const MIN_HEIGHT = 2;

export function AnnotationOverlay({
  pageId,
  documentId,
  disabled = false,
  onUpdate,
  onDelete,
}: AnnotationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const annotations = useAnnotationStore((state) => state.annotations);
  const selectedId = useAnnotationStore((state) => state.selectedAnnotationId);
  const selectAnnotation = useAnnotationStore(
    (state) => state.selectAnnotation,
  );
  const updateAnnotation = useAnnotationStore(
    (state) => state.updateAnnotation,
  );
  const updatePosition = useAnnotationStore((state) => state.updatePosition);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [previewPosition, setPreviewPosition] =
    useState<AnnotationPosition | null>(null);
  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(
    null,
  );

  const pageAnnotations = annotations.filter(
    (annotation) =>
      annotation.documentId === documentId && annotation.pageId === pageId,
  );

  function beginInteraction(
    event: React.PointerEvent<HTMLElement>,
    annotation: Annotation,
    mode: "move" | "resize",
  ) {
    if (disabled || event.button !== 0) return;

    event.stopPropagation();
    event.preventDefault();

    selectAnnotation(annotation.id);

    setDrag({
      id: annotation.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialPosition: { ...annotation.position },
    });

    setPreviewPosition({ ...annotation.position });

    containerRef.current?.setPointerCapture(event.pointerId);
  }

  function startDrag(
    event: React.PointerEvent<HTMLDivElement>,
    annotation: Annotation,
  ) {
    beginInteraction(event, annotation, "move");
  }

  function startResize(
    event: React.PointerEvent<HTMLButtonElement>,
    annotation: Annotation,
  ) {
    beginInteraction(event, annotation, "resize");
  }

  function moveAnnotation(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId || !containerRef.current) {
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    const deltaX = ((event.clientX - drag.startX) / bounds.width) * 100;
    const deltaY = ((event.clientY - drag.startY) / bounds.height) * 100;

    const initial = drag.initialPosition;

    if (drag.mode === "move") {
      setPreviewPosition({
        ...initial,
        x: Math.max(0, Math.min(100 - initial.width, initial.x + deltaX)),
        y: Math.max(0, Math.min(100 - initial.height, initial.y + deltaY)),
      });

      return;
    }

    const maxWidth = 100 - initial.x;
    const maxHeight = 100 - initial.y;

    setPreviewPosition({
      ...initial,
      width: Math.max(
        Math.min(MIN_WIDTH, maxWidth),
        Math.min(maxWidth, initial.width + deltaX),
      ),
      height: Math.max(
        Math.min(MIN_HEIGHT, maxHeight),
        Math.min(maxHeight, initial.height + deltaY),
      ),
    });
  }
  function createPositionUpdate(
    annotation: Annotation,
    position: AnnotationPosition,
  ): AnnotationUpdate {
    switch (annotation.type) {
      case "text":
        return { type: "text", changes: { position } };

      case "date":
        return { type: "date", changes: { position } };

      case "checkbox":
        return { type: "checkbox", changes: { position } };

      case "signature":
        return { type: "signature", changes: { position } };
    }
  }
  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (previewPosition) {
      const annotation = pageAnnotations.find((item) => item.id === drag.id);

      if (annotation) {
        updatePosition(drag.id, previewPosition);
        onUpdate(drag.id, createPositionUpdate(annotation, previewPosition));
      }
    }

    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }

    setDrag(null);
    setPreviewPosition(null);
  }

  function cancelDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }

    setDrag(null);
    setPreviewPosition(null);
  }

  function handleSignatureSave(value: string) {
    if (!editingSignatureId) return;

    const update: AnnotationUpdate = {
      type: "signature",
      changes: { value },
    };

    updateAnnotation(editingSignatureId, update);
    onUpdate(editingSignatureId, update);

    setEditingSignatureId(null);
  }

  async function handleDelete() {
    if (disabled || !selectedId) return;

    const annotation = pageAnnotations.find((item) => item.id === selectedId);

    if (!annotation) return;

    await onDelete(annotation.id);
  }

  function handleContentUpdate(update: AnnotationUpdate) {
    if (disabled || !selectedId) return;

    updateAnnotation(selectedId, update);
    onUpdate(selectedId, update);
  }

  function handleAnnotationChange(
    annotation: Annotation,
    value: string | boolean,
  ) {
    if (disabled) return;

    let update: AnnotationUpdate;

    switch (annotation.type) {
      case "text":
        if (typeof value !== "string") return;
        update = { type: "text", changes: { value } };
        break;

      case "date":
        if (typeof value !== "string") return;
        update = { type: "date", changes: { value } };
        break;

      case "checkbox":
        if (typeof value !== "boolean") return;
        update = { type: "checkbox", changes: { checked: value } };
        break;

      default:
        return;
    }

    updateAnnotation(annotation.id, update);
    onUpdate(annotation.id, update);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        onPointerMove={moveAnnotation}
        onPointerUp={stopDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={(event) => {
          if (drag?.pointerId !== event.pointerId) return;

          setDrag(null);
          setPreviewPosition(null);
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "Delete" || event.key === "Backspace") &&
            !disabled &&
            selectedId
          ) {
            const target = event.target as HTMLElement;

            if (
              target.isContentEditable ||
              ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
            ) {
              return;
            }

            event.preventDefault();
            handleDelete();
          }
        }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            selectAnnotation(null);
          }
        }}
      >
        {pageAnnotations.map((annotation) => {
          const selected = annotation.id === selectedId;

          const position =
            drag?.id === annotation.id && previewPosition
              ? previewPosition
              : annotation.position;

          return (
            <div
              key={annotation.id}
              role="button"
              tabIndex={0}
              aria-label={`${annotation.type} annotation`}
              aria-pressed={selected}
              onPointerDown={(event) => startDrag(event, annotation)}
              onDoubleClick={() => {
                if (!disabled && annotation.type === "signature") {
                  setEditingSignatureId(annotation.id);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectAnnotation(annotation.id);
                }
              }}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                width: `${position.width}%`,
                height: `${position.height}%`,
                fontSize: annotation.style.fontSize ?? 14,
                color: annotation.style.color ?? "#111827",
                backgroundColor:
                  annotation.style.backgroundColor ?? "rgba(59,130,246,0.08)",
                borderColor: selected
                  ? "var(--color-kui-brand)"
                  : (annotation.style.borderColor ?? "rgba(59,130,246,0.5)"),
                borderWidth: selected ? 2 : 1,
                touchAction: "none",
              }}
              className={`absolute flex items-center overflow-hidden border ${
                disabled ? "cursor-default" : "cursor-move"
              } ${selected ? "ring-2 ring-brand/20" : ""}`}
            >
              <AnnotationContent annotation={annotation} />

              {selected && !disabled && (
                <button
                  type="button"
                  aria-label="Resize annotation"
                  onPointerDown={(event) => startResize(event, annotation)}
                  className="absolute bottom-0 right-0 z-10 h-3 w-3 cursor-nwse-resize rounded-tl-sm border border-white bg-brand"
                />
              )}
            </div>
          );
        })}
      </div>

      {editingSignatureId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add signature</h3>

              <button
                type="button"
                onClick={() => setEditingSignatureId(null)}
                className="text-sm text-text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>

            <SignaturePad
              onSave={handleSignatureSave}
              onCancel={() => setEditingSignatureId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function AnnotationContent({ annotation }: { annotation: Annotation }) {
  switch (annotation.type) {
    case "text":
      return (
        <span className="truncate px-1">
          {annotation.value || annotation.placeholder || "Text"}
        </span>
      );

    case "date":
      return (
        <span className="truncate px-1">
          {annotation.value || annotation.placeholder || "Date"}
        </span>
      );

    case "checkbox":
      return (
        <span className="flex h-full w-full items-center justify-center">
          {annotation.checked ? "✓" : ""}
        </span>
      );

    case "signature":
      return (
        <span className="truncate px-1 italic">
          {annotation.value || "Double-click to sign"}
        </span>
      );
  }
}
