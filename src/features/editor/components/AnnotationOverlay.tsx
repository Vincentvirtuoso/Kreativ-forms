"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type {
  Annotation,
  AnnotationPosition,
  AnnotationUpdate,
} from "../domain/annotation.types";

import { useAnnotationStore } from "../stores/useAnnotationStore";
import { AnnotationBox } from "./annotations/AnnotationBox";
import { SnapGuides } from "./annotations/SnapGuides";
import type { ResizeHandle } from "../utils/annotation-geometry";
import { AnnotationToolbar } from "./annotations/AnnotationToolbar";
import { SignatureDialog } from "./annotations/SignatureDialog";
import { useDoubleTap } from "../hooks/useDoubleTap";
import { useAnnotationDrag } from "../hooks/useAnnotationDrag";
import {
  DEFAULT_SIZE,
  DEFAULT_TYPE,
  KEY_STEP,
  KEY_STEP_LARGE,
  type AnnotationType,
} from "../utils/annotation-overlay.constants";
import {
  clamp,
  computePosition,
  createPositionUpdate,
  positionsEqual,
} from "../utils/annotation-overlay.utils";

interface AnnotationOverlayProps {
  pageId: string;
  documentId: string;
  disabled?: boolean;
  /** Read-only rendering of the finished result (see PreviewDialog). */
  previewMode?: boolean;

  scale?: number;
  onUpdate: (id: string, update: AnnotationUpdate) => void;

  onDelete?: (id: string) => Promise<void> | void;

  onCreate?: (
    type: AnnotationType,
    position: AnnotationPosition,
  ) => string | void | Promise<string | void>;

  onChangeType?: (id: string, type: AnnotationType) => Promise<void> | void;
}

export function AnnotationOverlay({
  pageId,
  documentId,
  disabled = false,
  previewMode = false,
  scale = 1,
  onUpdate,
  onDelete,
  onCreate,
  onChangeType,
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

  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(
    null,
  );
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const registerTap = useDoubleTap();

  const pageAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation) =>
          annotation.documentId === documentId && annotation.pageId === pageId,
      ),
    [annotations, documentId, pageId],
  );

  const {
    preview,
    guides,
    startDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  } = useAnnotationDrag({
    containerRef,
    annotations: pageAnnotations,
    onPreviewPosition: updatePosition,
    onCommit: onUpdate,
  });

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
    handle?: ResizeHandle,
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

    startDrag(event, annotation, mode, handle);
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

  function handleStyleChange(
    annotation: Annotation,
    changes: Partial<Annotation["style"]>,
  ) {
    if (disabled) return;

    // An undefined value (e.g. the "Default" font) clears that property.
    const style = { ...annotation.style, ...changes };

    // NOTE: AnnotationUpdate must accept `style` inside `changes` for every
    // annotation type, otherwise widen that type instead of relying on the cast.
    const update = {
      type: annotation.type,
      changes: { style },
    } as AnnotationUpdate;

    updateAnnotation(annotation.id, update);
    onUpdate(annotation.id, update);
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
        onLostPointerCapture={handleLostPointerCapture}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;

          selectAnnotation(null);

          if (registerTap(event, "page")) {
            void createDefaultAnnotation(event);
          }
        }}
      >
        {pageAnnotations.map((annotation) => {
          const position =
            preview?.id === annotation.id
              ? preview.position
              : annotation.position;

          return (
            <AnnotationBox
              key={annotation.id}
              annotation={annotation}
              position={position}
              selected={annotation.id === selectedId}
              disabled={disabled}
              preview={previewMode}
              scale={scale}
              dragging={preview?.id === annotation.id ? preview.mode : null}
              onPointerDown={(event, mode, handle) =>
                beginInteraction(event, annotation, mode, handle)
              }
              onKeyDown={(event) => handleAnnotationKeyDown(event, annotation)}
              onChange={(value) => handleAnnotationChange(annotation, value)}
              onRequestSign={() => setEditingSignatureId(annotation.id)}
            />
          );
        })}

        <SnapGuides guides={guides} />
      </div>

      {showToolbar &&
        selectedAnnotation &&
        portalRoot &&
        createPortal(
          <AnnotationToolbar
            annotation={selectedAnnotation}
            canChangeType={!!onChangeType}
            canDelete={!!onDelete}
            onChangeType={(type) => void changeType(selectedAnnotation, type)}
            onDelete={() => void deleteAnnotation(selectedAnnotation.id)}
            onSign={() => setEditingSignatureId(selectedAnnotation.id)}
            onStyleChange={(changes) =>
              handleStyleChange(selectedAnnotation, changes)
            }
            onDone={() => selectAnnotation(null)}
          />,
          portalRoot,
        )}

      <SignatureDialog
        open={!!editingSignatureId}
        portalRoot={portalRoot}
        initialValue={editingSignature?.value}
        onSave={handleSignatureSave}
        onClose={() => setEditingSignatureId(null)}
      />
    </>
  );
}
