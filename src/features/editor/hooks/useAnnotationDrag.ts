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
  normalizePosition,
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
  annotations: Annotation[];
  onPreviewPosition: (id: string, position: AnnotationPosition) => void;
  onCommit: (id: string, update: AnnotationUpdate) => void;
}

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
    const container = containerRef.current;

    dragRef.current = null;
    previewRef.current = null;

    setPreview(null);
    setGuides(NO_GUIDES);

    if (pointerId !== undefined && container?.hasPointerCapture(pointerId)) {
      container.releasePointerCapture(pointerId);
    }
  }

  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    annotation: Annotation,
    mode: "move" | "resize",
    handle: ResizeHandle = "se",
  ) {
    const container = containerRef.current;

    if (!container || !event.isPrimary || event.button !== 0) {
      return;
    }

    event.preventDefault();

    // Cancel any previous interaction.
    if (dragRef.current) {
      resetDrag(dragRef.current.pointerId);
    }

    const initialPosition = normalizePosition(annotation.position);

    dragRef.current = {
      id: annotation.id,
      type: annotation.type,
      mode,
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialPosition,
    };

    previewRef.current = initialPosition;

    setPreview({
      id: annotation.id,
      mode,
      position: initialPosition,
    });

    setGuides(NO_GUIDES);

    container.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !container) {
      return;
    }

    const bounds = container.getBoundingClientRect();

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
        const otherPositions = annotations
          .filter((annotation) => annotation.id !== drag.id)
          .map((annotation) => annotation.position);

        const snapped = snapMove(moved, otherPositions);

        next = snapped.position;
        nextGuides = snapped.guides;
      }
    }

    previewRef.current = next;

    setPreview({
      id: drag.id,
      mode: drag.mode,
      position: next,
    });

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

    // Persist the final position once, after the interaction.
    onPreviewPosition(drag.id, next);
    onCommit(drag.id, createPositionUpdate(annotation, next));
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    // Cancellation must never commit an incomplete transform.
    resetDrag(event.pointerId);
  }

  function handleLostPointerCapture(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    resetDrag();
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
