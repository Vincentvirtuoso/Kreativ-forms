import type { Annotation, AnnotationType } from "../domain/annotation.types";

type AnnotationInput<T extends AnnotationType> = Omit<
  Extract<Annotation, { type: T }>,
  "id" | "createdAt" | "updatedAt"
>;

export function createAnnotation<T extends AnnotationType>(
  input: AnnotationInput<T>,
): Extract<Annotation, { type: T }> {
  const now = new Date().toISOString();

  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  } as Extract<Annotation, { type: T }>;
}
