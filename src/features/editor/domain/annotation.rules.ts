import type { Annotation, AnnotationPosition } from "./annotation.types";

export const ANNOTATION_RULES = {
  minWidth: 4,
  minHeight: 4,
  maxWidth: 100,
  maxHeight: 100,
  maxTextLength: 10_000,
} as const;

export function validateAnnotationPosition(position: AnnotationPosition): void {
  const { x, y, width, height } = position;

  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error("Annotation position must contain valid numbers.");
  }

  if (x < 0 || y < 0 || x > 100 || y > 100) {
    throw new Error("Annotation position is outside the page.");
  }

  if (
    width < ANNOTATION_RULES.minWidth ||
    height < ANNOTATION_RULES.minHeight ||
    width > ANNOTATION_RULES.maxWidth ||
    height > ANNOTATION_RULES.maxHeight
  ) {
    throw new Error("Annotation dimensions are invalid.");
  }

  if (x + width > 100 || y + height > 100) {
    throw new Error("Annotation extends beyond the page.");
  }
}

export function validateAnnotation(annotation: Annotation): void {
  validateAnnotationPosition(annotation.position);

  if (
    (annotation.type === "text" || annotation.type === "date") &&
    annotation.value.length > ANNOTATION_RULES.maxTextLength
  ) {
    throw new Error("Annotation value is too long.");
  }

  if (
    annotation.type === "date" &&
    annotation.value &&
    Number.isNaN(Date.parse(annotation.value))
  ) {
    throw new Error("Invalid date annotation value.");
  }
}
