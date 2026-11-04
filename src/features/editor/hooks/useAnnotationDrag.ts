"use client";

import { useRef, useState, type RefObject } from "react";

import type {
  Annotation,
  AnnotationPosition,
  AnnotationUpdate,
} from "../domain/annotation.types";
import { ANNOTATION_RULES } from "../domain/annotation.rules";
import {
  computePosition,
  createPositionUpdate,
  positionsEqual,
} from "../utils/annotation-overlay.utils";
import {
  resizeFromHandle,
  snapMove,
  type ResizeHandle,
  type SnapGuides,
} from "../utils/annotation-geometry";

type DragState = {
  id: string;
  type: Annotation["type"];
  mode: "move" | "resize";
  handle: ResizeHandle;
  pointerId: number;
  startX: number;
  startY: number;
  initialPosition: AnnotationPosition;
};

export type DragPreview = {
  id: string;
  mode: "move" | "resize";
  position: AnnotationPosition;
};

const NO_GUIDES: SnapGuides = { x: [], y: [] };

interface UseAnnotationDragOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  /** Annotations on the current page (used for snapping to neighbours). */
  annotations: Annotation[];
  onPreviewPosition: (id: string, position: AnnotationPosition) => void;
  onCommit: (id: string, update: AnnotationUpdate) => void;
}

/**
 * Pointer-driven move and resize for annotations.
 *
 *  - Move snaps to the page edges / centre and to other annotations.
 *    Hold Alt to move freely.
 *  - Resize works from all 8 handles. Hold Shift to keep the proportions
 *    (checkboxes always do).
 *  - Sizes always respect ANNOTATION_RULES, so a drag can never produce a
 *    position the validator rejects.
 */
export function useAnnotationDrag({
  containerRef,
  annotations,
  onPreviewPosition,
  onCommit,
}: UseAnnotationDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<AnnotationPosition | null>(null);

  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [guides, setGuides] = useState<SnapGuides>(NO_GUIDES);

  function resetDrag(pointerId?: number) {
    dragRef.current = null;
    previewRef.current = null;
    setPreview(null);
    setGuides(NO_GUIDES);

    if (
      pointerId !== undefined &&
      containerRef.current?.hasPointerCapture(pointerId)
    ) {
      containerRef.current.releasePointerCapture(pointerId);
    }
  }

  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    annotation: Annotation,
    mode: "move" | "resize",
    handle: ResizeHandle = "se",
  ) {
    dragRef.current = {
      id: annotation.id,
      type: annotation.type,
      mode,
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialPosition: { ...annotation.position },
    };
    previewRef.current = { ...annotation.position };

    setPreview({
      id: annotation.id,
      mode,
      position: { ...annotation.position },
    });

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

    let next: AnnotationPosition;
    let nextGuides = NO_GUIDES;

    if (drag.mode === "resize") {
      next = resizeFromHandle(
        drag.initialPosition,
        drag.handle,
        deltaX,
        deltaY,
        {
          minWidth: ANNOTATION_RULES.minWidth,
          minHeight: ANNOTATION_RULES.minHeight,
          keepAspect: event.shiftKey || drag.type === "checkbox",
        },
      );
    } else {
      const moved = computePosition(
        "move",
        drag.initialPosition,
        deltaX,
        deltaY,
      );

      if (event.altKey) {
        next = moved;
      } else {
        const snapped = snapMove(
          moved,
          annotations
            .filter((annotation) => annotation.id !== drag.id)
            .map((annotation) => annotation.position),
        );

        next = snapped.position;
        nextGuides = snapped.guides;
      }
    }

    previewRef.current = next;
    setPreview({ id: drag.id, mode: drag.mode, position: next });
    setGuides(nextGuides);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const next = previewRef.current;
    const annotation = annotations.find((item) => item.id === drag.id);

    resetDrag(event.pointerId);

    if (!annotation || !next || positionsEqual(next, drag.initialPosition)) {
      return;
    }

    onPreviewPosition(drag.id, next);
    onCommit(drag.id, createPositionUpdate(annotation, next));
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    resetDrag(event.pointerId);
  }

  function handleLostPointerCapture(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) resetDrag();
  }

  return {
    preview,
    guides,
    startDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  };
}
