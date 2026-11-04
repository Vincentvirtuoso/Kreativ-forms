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
import { ANNOTATION_RULES } from "../domain/annotation.rules";
import { Button } from "@splenddev/kreativ-ui/components";

type AnnotationType = Annotation["type"];

interface AnnotationOverlayProps {
  pageId: string;
  documentId: string;
  disabled?: boolean;

  scale?: number;
  onUpdate: (id: string, update: AnnotationUpdate) => void;

  onDelete?: (id: string) => Promise<void> | void;

  onCreate?: (
    type: AnnotationType,
    position: AnnotationPosition,
  ) => string | void | Promise<string | void>;

  onChangeType?: (id: string, type: AnnotationType) => Promise<void> | void;
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

type Tap = { time: number; x: number; y: number; key: string };

const MIN_WIDTH = ANNOTATION_RULES.minWidth;
const MIN_HEIGHT = ANNOTATION_RULES.minHeight;
const BASE_FONT_SIZE = 14;
const KEY_STEP = 1;
const KEY_STEP_LARGE = 5;

const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DISTANCE = 28;

const DEFAULT_TYPE: AnnotationType = "text";

const DEFAULT_SIZE: Record<AnnotationType, { width: number; height: number }> =
  {
    text: { width: 30, height: 12 },
    date: { width: 25, height: 12 },
    checkbox: { width: 12, height: 12 },
    signature: { width: 35, height: 12 },
  };

const TYPE_OPTIONS: { type: AnnotationType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "date", label: "Date" },
  { type: "checkbox", label: "Checkbox" },
  { type: "signature", label: "Signature" },
];

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
  onCreate,
  onChangeType,
}: AnnotationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<AnnotationPosition | null>(null);
  const lastTapRef = useRef<Tap | null>(null);

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

  const selectedAnnotation = pageAnnotations.find(
    (annotation) => annotation.id === selectedId,
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

  /**
   * Unified double-click / double-tap detection. Native `dblclick` is
   * unreliable on touch devices, so we track taps ourselves via pointerdown.
   */
  function registerTap(event: React.PointerEvent, key: string): boolean {
    const now = event.timeStamp;
    const last = lastTapRef.current;

    const isDouble =
      !!last &&
      last.key === key &&
      now - last.time <= DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) <=
        DOUBLE_TAP_DISTANCE;

    lastTapRef.current = isDouble
      ? null
      : { time: now, x: event.clientX, y: event.clientY, key };

    return isDouble;
  }

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

  async function createDefaultAnnotation(event: React.PointerEvent) {
    if (disabled || !onCreate || !containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const size = DEFAULT_SIZE[DEFAULT_TYPE];
    const pointX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointY = ((event.clientY - bounds.top) / bounds.height) * 100;

    const position: AnnotationPosition = {
      ...size,
      x: clamp(pointX - size.width / 2, 0, 100 - size.width),
      y: clamp(pointY - size.height / 2, 0, 100 - size.height),
    };

    try {
      const id = await onCreate(DEFAULT_TYPE, position);
      if (id) selectAnnotation(id);
    } catch (error) {
      console.error("Failed to create annotation", error);
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

    if (
      mode === "move" &&
      annotation.type === "signature" &&
      registerTap(event, annotation.id)
    ) {
      setEditingSignatureId(annotation.id);
      return;
    }

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

  async function changeType(annotation: Annotation, type: AnnotationType) {
    if (disabled || !onChangeType || annotation.type === type) return;

    try {
      await onChangeType(annotation.id, type);
      if (type === "signature") setEditingSignatureId(annotation.id);
    } catch (error) {
      console.error("Failed to change annotation type", error);
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

  const showToolbar =
    !disabled && !!selectedAnnotation && !!portalRoot && !editingSignatureId;

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        style={{ touchAction: "manipulation" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) resetDrag();
        }}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;

          selectAnnotation(null);

          if (registerTap(event, "page")) {
            void createDefaultAnnotation(event);
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

          const showMoveGrip =
            selected &&
            !disabled &&
            (annotation.type === "text" || annotation.type === "date");

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
              {/*
                Content only receives pointer events once the annotation is
                selected. Before that, a touch/click on it falls through to the
                wrapper so it can be selected and dragged (inputs fill the whole
                box, which would otherwise make them impossible to move on touch).
              */}
              <div
                className={`flex h-full w-full items-center ${
                  selected && !disabled ? "" : "pointer-events-none"
                }`}
              >
                <AnnotationContent
                  annotation={annotation}
                  disabled={disabled}
                  onChange={(value) =>
                    handleAnnotationChange(annotation, value)
                  }
                  onRequestSign={() => setEditingSignatureId(annotation.id)}
                />
              </div>

              {showMoveGrip && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Move annotation"
                  onPointerDown={(event) =>
                    beginInteraction(event, annotation, "move")
                  }
                  className="absolute left-0 top-0 z-10 h-3 w-3 cursor-move rounded-br-sm border border-white bg-brand before:absolute before:-inset-2 before:content-[''] pointer-coarse:h-6 pointer-coarse:w-6 pointer-coarse:before:-inset-1"
                />
              )}

              {selected && !disabled && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Resize annotation"
                  onPointerDown={(event) =>
                    beginInteraction(event, annotation, "resize")
                  }
                  className="absolute bottom-0 right-0 z-10 h-3 w-3 cursor-nwse-resize rounded-tl-sm border border-white bg-brand before:absolute before:-inset-2 before:content-[''] pointer-coarse:h-6 pointer-coarse:w-6 pointer-coarse:before:-inset-1"
                />
              )}
            </div>
          );
        })}
      </div>

      {showToolbar &&
        selectedAnnotation &&
        createPortal(
          <AnnotationToolbar
            annotation={selectedAnnotation}
            canChangeType={!!onChangeType}
            canDelete={!!onDelete}
            onChangeType={(type) => void changeType(selectedAnnotation, type)}
            onDelete={() => void deleteAnnotation(selectedAnnotation.id)}
            onSign={() => setEditingSignatureId(selectedAnnotation.id)}
            onDone={() => selectAnnotation(null)}
          />,
          portalRoot,
        )}

      {editingSignatureId &&
        portalRoot &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
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
              className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-xl border border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingSignature?.value ? "Edit signature" : "Add signature"}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSignatureId(null)}
                  className="min-h-10 px-2 text-sm text-text-muted hover:text-text"
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

/**
 * Bottom-docked toolbar for the selected annotation. Docked at the bottom so
 * it sits within thumb reach on phones and never gets clipped by the page.
 */
function AnnotationToolbar({
  annotation,
  canChangeType,
  canDelete,
  onChangeType,
  onDelete,
  onSign,
  onDone,
}: {
  annotation: Annotation;
  canChangeType: boolean;
  canDelete: boolean;
  onChangeType: (type: AnnotationType) => void;
  onDelete: () => void;
  onSign: () => void;
  onDone: () => void;
}) {
  const buttonBase =
    "min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div
      role="toolbar"
      aria-label="Annotation tools"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background p-1.5 shadow-lg">
        {canChangeType && (
          <div
            role="group"
            aria-label="Annotation type"
            className="flex items-center gap-1"
          >
            {TYPE_OPTIONS.map((option) => {
              const active = annotation.type === option.type;

              return (
                <Button
                  key={option.type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeType(option.type)}
                  color={active ? "brand" : "neutral"}
                  variant={active ? "solid" : "ghost"}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        )}

        {annotation.type === "signature" && (
          <>
            <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />
            <Button type="button" onClick={onSign} variant="soft">
              {annotation.value ? "Redo" : "Sign"}
            </Button>
          </>
        )}

        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />

        {canDelete && (
          <Button
            type="button"
            onClick={onDelete}
            variant="ghost"
            color="destructive"
          >
            Delete
          </Button>
        )}

        <Button type="button" onClick={onDone} variant="ghost" color="brand">
          Done
        </Button>
      </div>
    </div>
  );
}

function AnnotationContent({
  annotation,
  disabled,
  onChange,
  onRequestSign,
}: {
  annotation: Annotation;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
  onRequestSign: () => void;
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
          onClick={onRequestSign}
          className="h-full w-full text-center text-xs italic text-text-muted"
        >
          Tap to sign
        </button>
      );
  }
}
