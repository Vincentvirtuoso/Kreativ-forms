"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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
import { useAnnotationTransform } from "../hooks/useAnnotationTransform";

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

import { usePortalRoot } from "@/hooks/usePortalRoot";
import { composeRefs } from "@/utils/composeRefs";
import type { InteractionMode } from "../domain/annotation-interaction.types";

interface AnnotationOverlayProps {
  pageId: string;
  documentId: string;
  disabled?: boolean;

  /** Read-only rendering of the finished result. */
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

const noop = () => {};
const noopAsync = async () => {};

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
  // --------------------------------------------------
  // Store
  // --------------------------------------------------

  const annotations = useAnnotationStore((state) => state.annotations);

  const selectedId = useAnnotationStore((state) => state.selectedAnnotationId);

  const selectAnnotation = useAnnotationStore(
    (state) => state.selectAnnotation,
  );

  const updateAnnotation = useAnnotationStore(
    (state) => state.updateAnnotation,
  );

  const updatePosition = useAnnotationStore((state) => state.updatePosition);

  // --------------------------------------------------
  // Interaction state
  // --------------------------------------------------

  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("select");

  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(
    null,
  );

  const dragContainerRef = useRef<HTMLDivElement>(null);

  const canInteract = !disabled && !previewMode;

  // --------------------------------------------------
  // Portal and refs
  // --------------------------------------------------

  const registerTap = useDoubleTap();

  const { portalRoot, containerRef: portalContainerRef } = usePortalRoot();

  const shortcutRef = useKeyboardShortcuts<HTMLDivElement>(
    canInteract,
    {
      v: () => {
        setInteractionMode("select");
      },

      m: () => {
        setInteractionMode("move");
      },

      s: () => {
        setInteractionMode("resize");
      },

      r: () => {
        setInteractionMode("rotate");
      },

      escape: () => {
        if (editingSignatureId) return;

        setInteractionMode("select");
        selectAnnotation(null);
      },

      delete: () => {
        if (!selectedAnnotation) return;

        void deleteAnnotation(selectedAnnotation.id);
      },

      backspace: () => {
        if (!selectedAnnotation) return;

        void deleteAnnotation(selectedAnnotation.id);
      },
    },
    [editingSignatureId, selectedId, pageId, documentId, canInteract],
  );

  const containerRef = useMemo(
    () => composeRefs(portalContainerRef, dragContainerRef, shortcutRef),
    [portalContainerRef, shortcutRef],
  );

  // --------------------------------------------------
  // Page annotations
  // --------------------------------------------------

  const pageAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation) =>
          annotation.documentId === documentId && annotation.pageId === pageId,
      ),
    [annotations, documentId, pageId],
  );

  const selectedAnnotation = useMemo(
    () =>
      canInteract
        ? pageAnnotations.find((annotation) => annotation.id === selectedId)
        : undefined,
    [canInteract, pageAnnotations, selectedId],
  );

  const editingSignature = pageAnnotations.find(
    (annotation): annotation is Extract<Annotation, { type: "signature" }> =>
      annotation.id === editingSignatureId && annotation.type === "signature",
  );

  // --------------------------------------------------
  // Transform operations
  // --------------------------------------------------

  const transform = useAnnotationTransform({
    onUpdate,
    updatePosition,
  });

  // --------------------------------------------------
  // Drag interaction
  // --------------------------------------------------

  const {
    preview,
    guides,
    startDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  } = useAnnotationDrag({
    containerRef: dragContainerRef,
    annotations: pageAnnotations,
    onPreviewPosition: updatePosition,
    onCommit: onUpdate,
  });

  // --------------------------------------------------
  // Annotation creation
  // --------------------------------------------------

  async function createDefaultAnnotation(event: React.PointerEvent) {
    if (!canInteract || !onCreate || !dragContainerRef.current) {
      return;
    }

    const bounds = dragContainerRef.current.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    const size = DEFAULT_SIZE[DEFAULT_TYPE];

    const pointX = ((event.clientX - bounds.left) / bounds.width) * 100;

    const pointY = ((event.clientY - bounds.top) / bounds.height) * 100;

    const position: AnnotationPosition = {
      ...size,
      x: clamp(pointX - size.width / 2, 0, 100 - size.width),
      y: clamp(pointY - size.height / 2, 0, 100 - size.height),
      rotation: 0,
    };

    try {
      const id = await onCreate(DEFAULT_TYPE, position);

      if (id) selectAnnotation(id);
    } catch (error) {
      console.error("Failed to create annotation", error);
    }
  }

  // --------------------------------------------------
  // Pointer interactions
  // --------------------------------------------------

  function beginInteraction(
    event: React.PointerEvent<HTMLElement>,
    annotation: Annotation,
    mode: "move" | "resize",
    handle?: ResizeHandle,
  ) {
    if (!canInteract || event.button !== 0) return;

    // Tool-specific interaction restrictions.
    if (interactionMode === "rotate") return;

    if (mode === "move" && interactionMode === "resize") {
      return;
    }

    if (
      mode === "resize" &&
      interactionMode !== "resize" &&
      interactionMode !== "select"
    ) {
      return;
    }

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

  // --------------------------------------------------
  // Position updates
  // --------------------------------------------------

  function commitPosition(
    annotation: Annotation,
    position: AnnotationPosition,
  ) {
    if (!canInteract) return;

    updatePosition(annotation.id, position);

    onUpdate(annotation.id, createPositionUpdate(annotation, position));
  }

  // --------------------------------------------------
  // Annotation deletion
  // --------------------------------------------------

  async function deleteAnnotation(id: string) {
    if (!canInteract || !onDelete) return;

    try {
      await onDelete(id);

      if (selectedId === id) {
        selectAnnotation(null);
      }

      if (editingSignatureId === id) {
        setEditingSignatureId(null);
      }
    } catch (error) {
      console.error("Failed to delete annotation", error);
    }
  }

  // --------------------------------------------------
  // Annotation type changes
  // --------------------------------------------------

  async function changeType(annotation: Annotation, type: AnnotationType) {
    if (!canInteract || !onChangeType || annotation.type === type) {
      return;
    }

    try {
      await onChangeType(annotation.id, type);

      if (type === "signature") {
        setEditingSignatureId(annotation.id);
      }
    } catch (error) {
      console.error("Failed to change annotation type", error);
    }
  }

  // --------------------------------------------------
  // Signature editing
  // --------------------------------------------------

  function handleSignatureSave(value: string) {
    if (!canInteract || !editingSignatureId) return;

    const update: AnnotationUpdate = {
      type: "signature",
      changes: { value },
    };

    updateAnnotation(editingSignatureId, update);
    onUpdate(editingSignatureId, update);

    setEditingSignatureId(null);
  }

  // --------------------------------------------------
  // Annotation styling
  // --------------------------------------------------

  function handleStyleChange(
    annotation: Annotation,
    changes: Partial<Annotation["style"]>,
  ) {
    if (!canInteract) return;

    const style = {
      ...annotation.style,
      ...changes,
    };

    const update = {
      type: annotation.type,
      changes: { style },
    } as AnnotationUpdate;

    updateAnnotation(annotation.id, update);
    onUpdate(annotation.id, update);
  }

  // --------------------------------------------------
  // Annotation value changes
  // --------------------------------------------------

  function handleAnnotationChange(
    annotation: Annotation,
    value: string | boolean,
  ) {
    if (!canInteract) return;

    let update: AnnotationUpdate;

    switch (annotation.type) {
      case "text":
        if (typeof value !== "string") return;

        update = {
          type: "text",
          changes: { value },
        };
        break;

      case "date":
        if (typeof value !== "string") return;

        update = {
          type: "date",
          changes: { value },
        };
        break;

      case "checkbox":
        if (typeof value !== "boolean") return;

        update = {
          type: "checkbox",
          changes: { checked: value },
        };
        break;

      default:
        return;
    }

    updateAnnotation(annotation.id, update);
    onUpdate(annotation.id, update);
  }

  // --------------------------------------------------
  // Keyboard transformations
  // --------------------------------------------------

  function handleAnnotationKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    annotation: Annotation,
  ) {
    if (!canInteract) return;

    // Let nested inputs and controls handle their own keys.
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
      event.preventDefault();

      setInteractionMode("select");
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

    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;

    if (interactionMode === "rotate") {
      // Rotation will be implemented with the transform model.
      return;
    }

    if (interactionMode === "resize") {
      transform.resize(annotation, direction[0] * step, direction[1] * step);

      return;
    }

    transform.nudge(annotation, direction, event.shiftKey);
  }

  // --------------------------------------------------
  // Toolbar visibility
  // --------------------------------------------------

  const showToolbar =
    canInteract && !!selectedAnnotation && !!portalRoot && !editingSignatureId;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <>
      <div
        ref={containerRef}
        data-interaction-mode={interactionMode}
        className="absolute inset-0 overflow-hidden"
        style={{ touchAction: "manipulation" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerDown={(event) => {
          if (!canInteract) return;

          if (event.target !== event.currentTarget) return;

          selectAnnotation(null);

          if (interactionMode === "select" && registerTap(event, "page")) {
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
              selected={annotation.id === selectedId && canInteract}
              disabled={!canInteract}
              preview={previewMode}
              scale={scale}
              interactionMode={interactionMode}
              dragging={preview?.id === annotation.id ? preview.mode : null}
              onPointerDown={(event, mode, handle) =>
                beginInteraction(event, annotation, mode, handle)
              }
              onKeyDown={(event) => handleAnnotationKeyDown(event, annotation)}
              onChange={(value) => handleAnnotationChange(annotation, value)}
              onRequestSign={() => {
                if (canInteract) {
                  setEditingSignatureId(annotation.id);
                }
              }}
            />
          );
        })}

        {canInteract && <SnapGuides guides={guides} />}
      </div>

      {/* Contextual toolbar */}
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

      {/* Signature editor */}
      <SignatureDialog
        open={canInteract && !!editingSignatureId}
        portalRoot={portalRoot}
        initialValue={editingSignature?.value}
        onSave={handleSignatureSave}
        onClose={() => setEditingSignatureId(null)}
      />
    </>
  );
}
