import type {
  Annotation,
  AnnotationPosition,
  AnnotationUpdate,
} from "../domain/annotation.types";
import { MIN_HEIGHT, MIN_WIDTH } from "./annotation-overlay.constants";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function positionsEqual(a: AnnotationPosition, b: AnnotationPosition) {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.rotation === b.rotation
  );
}

export function createPositionUpdate(
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

export function computePosition(
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

export function normalizePosition(
  position: AnnotationPosition,
): AnnotationPosition {
  return {
    ...position,
    rotation: Number.isFinite(position.rotation) ? position.rotation : 0,
  };
}