import type {
  Annotation,
  CreateAnnotationInput,
} from "../domain/annotation.types";

export function createAnnotation<T extends CreateAnnotationInput>(
  input: T,
): T & Pick<Annotation, "id" | "createdAt" | "updatedAt"> {
  const now = new Date().toISOString();

  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}
