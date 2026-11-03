"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

  scale?: number;
  onUpdate: (id: string, update: AnnotationUpdate) => void;

  onDelete?: (id: string) => Promise<void> | void;
}

type DragState = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  initialPosition: AnnotationPosition;
};

type Preview = { id: string; position: AnnotationPosition };

const MIN_WIDTH = 2;
const MIN_HEIGHT = 2;
const BASE_FONT_SIZE = 14;
const KEY_STEP = 1;
const KEY_STEP_LARGE = 5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function positionsEqual(a: AnnotationPosition, b: AnnotationPosition) {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
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

function computePosition(
  mode: "move" | "resize",
  initial: AnnotationPosition,
  deltaX: number,
  deltaY: number,
): AnnotationPosition {
  if (mode === "move") {
    return {
      ...initial,
      x: clamp(initial.x + deltaX, 0, 100 - initial.width),
      y: clamp(initial.y + deltaY, 0, 100 - initial.height),
    };
  }

  const maxWidth = 100 - initial.x;
  const maxHeight = 100 - initial.y;

  return {
    ...initial,
    width: clamp(
      initial.width + deltaX,
      Math.min(MIN_WIDTH, maxWidth),
      maxWidth,
    ),
    height: clamp(
      initial.height + deltaY,
      Math.min(MIN_HEIGHT, maxHeight),
      maxHeight,
    ),
  };
}

export function AnnotationOverlay({
  pageId,
  documentId,
  disabled = false,
  scale = 1,
  onUpdate,
  onDelete,
}: AnnotationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<AnnotationPosition | null>(null);

  const annotations = useAnnotationStore((state) => state.annotations);
  const selectedId = useAnnotationStore((state) => state.selectedAnnotationId);
  const selectAnnotation = useAnnotationStore(
    (state) => state.selectAnnotation,
  );
  const updateAnnotation = useAnnotationStore(
    (state) => state.updateAnnotation,
  );
  const updatePosition = useAnnotationStore((state) => state.updatePosition);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(
    null,
  );
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  
  const pageAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation) =>
          annotation.documentId === documentId && annotation.pageId === pageId,
      ),
    [annotations, documentId, pageId],
  );

  const editingSignature = pageAnnotations.find(
    (annotation): annotation is Extract<Annotation, { type: "signature" }> =>
      annotation.id === editingSignatureId && annotation.type === "signature",
  );

  useEffect(() => {
    setPortalRoot(
      containerRef.current?.closest<HTMLElement>("[data-kreativ-theme]") ??
        null,
    );
  }, []);

  useEffect(() => {
    if (!editingSignatureId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEditingSignatureId(null);
    }
    
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingSignatureId]);

  function resetDrag(pointerId?: number) {
    dragRef.current = null;
    previewRef.current = null;
    setPreview(null);

    if (
      pointerId !== undefined &&
      containerRef.current?.hasPointerCapture(pointerId)
    ) {
      containerRef.current.releasePointerCapture(pointerId);
    }
  }

  function beginInteraction(
    event: React.PointerEvent<HTMLElement>,
    annotation: Annotation,
    mode: "move" | "resize",
  ) {
    if (disabled || event.button !== 0) return;

    const target = event.target as HTMLElement;

    if (mode === "move" && target.closest("input, textarea, select, button")) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    selectAnnotation(annotation.id);

    event.currentTarget
      .closest<HTMLElement>("[data-annotation-id]")
      ?.focus({ preventScroll: true });

    dragRef.current = {
      id: annotation.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialPosition: { ...annotation.position },
    };
    previewRef.current = { ...annotation.position };
    setPreview({ id: annotation.id, position: { ...annotation.position } });

    containerRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !containerRef.current) {
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    const deltaX = ((event.clientX - drag.startX) / bounds.width) * 100;
    const deltaY = ((event.clientY - drag.startY) / bounds.height) * 100;

    const next = computePosition(
      drag.mode,
      drag.initialPosition,
      deltaX,
      deltaY,
    );

    previewRef.current = next;
    setPreview({ id: drag.id, position: next });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const next = previewRef.current;
    const annotation = pageAnnotations.find((item) => item.id === drag.id);

    resetDrag(event.pointerId);

    if (!annotation || !next || positionsEqual(next, drag.initialPosition)) {
      return;
    }

    updatePosition(drag.id, next);
    onUpdate(drag.id, createPositionUpdate(annotation, next));
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    resetDrag(event.pointerId);
  }

  function commitPosition(
    annotation: Annotation,
    position: AnnotationPosition,
  ) {
    updatePosition(annotation.id, position);
    onUpdate(annotation.id, createPositionUpdate(annotation, position));
  }

  async function deleteAnnotation(id: string) {
    if (disabled || !onDelete) return;

    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete annotation", error);
    }
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

  function handleAnnotationKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    annotation: Annotation,
  ) {
    if (disabled) return;

    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectAnnotation(annotation.id);

      if (annotation.type === "signature") {
        setEditingSignatureId(annotation.id);
      }
      return;
    }

    if (event.key === "Escape") {
      selectAnnotation(null);
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (!onDelete) return;
      event.preventDefault();
      void deleteAnnotation(annotation.id);
      return;
    }

    const directions: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };

    const direction = directions[event.key];

    if (!direction) return;

    event.preventDefault();
    selectAnnotation(annotation.id);

    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const position = annotation.position;

    const next = event.altKey
      ? computePosition(
          "resize",
          position,
          direction[0] * step,
          direction[1] * step,
        )
      : computePosition(
          "move",
          position,
          direction[0] * step,
          direction[1] * step,
        );

    if (!positionsEqual(next, position)) {
      commitPosition(annotation, next);
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) resetDrag();
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
            preview?.id === annotation.id
              ? preview.position
              : annotation.position;

          const fontSize =
            (annotation.style.fontSize ?? BASE_FONT_SIZE) * scale;

          return (
            <div
              key={annotation.id}
              data-annotation-id={annotation.id}
              role="group"
              tabIndex={0}
              aria-label={`${annotation.type} annotation`}
              data-selected={selected}
              onPointerDown={(event) =>
                beginInteraction(event, annotation, "move")
              }
              onDoubleClick={() => {
                if (!disabled && annotation.type === "signature") {
                  setEditingSignatureId(annotation.id);
                }
              }}
              onKeyDown={(event) => handleAnnotationKeyDown(event, annotation)}
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
                    : (annotation.style.backgroundColor ??
                      "rgba(59,130,246,0.08)"),
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
              <AnnotationContent
                annotation={annotation}
                disabled={disabled}
                onChange={(value) => handleAnnotationChange(annotation, value)}
              />

              {selected && !disabled && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Resize annotation"
                  onPointerDown={(event) =>
                    beginInteraction(event, annotation, "resize")
                  }
                  className="absolute bottom-0 right-0 z-10 h-3 w-3 cursor-nwse-resize rounded-tl-sm border border-white bg-brand before:absolute before:-inset-2 before:content-['']"
                />
              )}
            </div>
          );
        })}
      </div>

      {editingSignatureId &&
        portalRoot &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                setEditingSignatureId(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add signature"
              className="w-full max-w-lg rounded-xl border border-border bg-background p-4 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingSignature?.value ? "Edit signature" : "Add signature"}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSignatureId(null)}
                  className="text-sm text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>

              <SignaturePad
                initialValue={editingSignature?.value}
                onSave={handleSignatureSave}
                onCancel={() => setEditingSignatureId(null)}
              />
            </div>
          </div>,
          portalRoot,
        )}
    </>
  );
}

function AnnotationContent({
  annotation,
  disabled,
  onChange,
}: {
  annotation: Annotation;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  const controlClass =
    "h-full w-full min-w-0 border-0 bg-transparent px-1 text-inherit outline-none";

  switch (annotation.type) {
    case "text":
      return annotation.multiline ? (
        <textarea
          value={annotation.value}
          placeholder={annotation.placeholder ?? "Enter text"}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClass} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={annotation.value}
          placeholder={annotation.placeholder ?? "Enter text"}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={annotation.value}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
      );

    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={annotation.checked}
          disabled={disabled}
          aria-label="Checkbox annotation"
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.checked)}
          className="mx-auto size-[1.15em] accent-brand"
        />
      );

    case "signature":
      return annotation.value ? (
        <img
          src={annotation.value}
          alt="Signature"
          draggable={false}
          className="h-full w-full select-none object-contain p-1"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            // The annotation's double-click handler opens the signature pad.
          }}
          className="h-full w-full text-center text-xs italic text-text-muted"
        >
          Double-click to sign
        </button>
      );
  }
}
