"use client";

import { useRef, useState, type RefObject } from "react";

import type {
  Annotation,
  AnnotationPosition,
  AnnotationUpdate,
} from "../domain/annotation.types";
import {
  computePosition,
  createPositionUpdate,
  positionsEqual,
} from "../utils/annotation-overlay.utils";

type DragState = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  initialPosition: AnnotationPosition;
};

type Preview = { id: string; position: AnnotationPosition };

interface UseAnnotationDragOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  annotations: Annotation[];
  /** Called once when the drag is committed (mirrors store + parent update). */
  onCommit: (id: string, update: AnnotationUpdate) => void;
  /** Optimistic local position, used by the store. */
  onPreviewPosition: (id: string, position: AnnotationPosition) => void;
}

export function useAnnotationDrag({
  containerRef,
  annotations,
  onCommit,
  onPreviewPosition,
}: UseAnnotationDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<AnnotationPosition | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

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

  /** Pure drag start — callers are expected to run guards beforehand. */
  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    annotation: Annotation,
    mode: "move" | "resize",
  ) {
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
    startDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  };
}
