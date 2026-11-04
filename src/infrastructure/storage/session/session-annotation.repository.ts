import type {
  Annotation,
  AnnotationId,
  AnnotationUpdate,
  ReplaceAnnotationInput,
} from "@/features/editor/domain/annotation.types";

import type {
  DocumentId,
  PageId,
} from "@/features/documents/domain/document.types";

import { validateAnnotation } from "@/features/editor/domain/annotation.rules";
import { sessionDocumentState } from "./session-document.state";

import type { AnnotationRepository } from "@/features/editor/repositories/annotation.repository";

export class SessionAnnotationRepository implements AnnotationRepository {
  private readonly annotations = sessionDocumentState.annotations;

  async create(annotation: Annotation): Promise<void> {
    if (this.annotations.has(annotation.id)) {
      throw new Error("Annotation already exists.");
    }

    validateAnnotation(annotation);

    this.annotations.set(annotation.id, structuredClone(annotation));
  }

  async getById(id: AnnotationId): Promise<Annotation | null> {
    const annotation = this.annotations.get(id);

    return annotation ? structuredClone(annotation) : null;
  }

  async getByDocumentId(documentId: DocumentId): Promise<Annotation[]> {
    return [...this.annotations.values()]
      .filter((annotation) => annotation.documentId === documentId)
      .map((annotation) => structuredClone(annotation));
  }

  async getByPageId(pageId: PageId): Promise<Annotation[]> {
    return [...this.annotations.values()]
      .filter((annotation) => annotation.pageId === pageId)
      .map((annotation) => structuredClone(annotation));
  }

  async update(id: AnnotationId, update: AnnotationUpdate): Promise<void> {
    const current = this.annotations.get(id);

    if (!current) {
      throw new Error("Annotation not found.");
    }

    if (current.type !== update.type) {
      throw new Error("Annotation type mismatch.");
    }

    const next = {
      ...current,
      ...update.changes,
      position: update.changes.position
        ? { ...current.position, ...update.changes.position }
        : current.position,
      style: update.changes.style
        ? { ...current.style, ...update.changes.style }
        : current.style,
      updatedAt: new Date().toISOString(),
    } as Annotation;

    validateAnnotation(next);

    this.annotations.set(id, structuredClone(next));
  }

  async replace(input: ReplaceAnnotationInput): Promise<void> {
    const existing = this.annotations.get(input.id);
    const now = new Date().toISOString();

    const next = {
      ...(existing ?? {}),
      ...input,
      // Trust a caller-supplied createdAt (restore/sync), otherwise preserve
      // the original record's, otherwise stamp now.
      createdAt:
        (input as Partial<Annotation>).createdAt ?? existing?.createdAt ?? now,
      updatedAt: now,
    } as Annotation;

    validateAnnotation(next);

    this.annotations.set(next.id, structuredClone(next));
  }

  async delete(id: AnnotationId): Promise<void> {
    this.annotations.delete(id);
  }

  async deleteByDocumentId(documentId: DocumentId): Promise<void> {
    for (const [id, annotation] of this.annotations) {
      if (annotation.documentId === documentId) {
        this.annotations.delete(id);
      }
    }
  }
}
