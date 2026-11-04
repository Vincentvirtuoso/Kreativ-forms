import { database } from "./database";

import type {
  Annotation,
  AnnotationId,
  AnnotationUpdate,
} from "@/features/editor/domain/annotation.types";

import type {
  DocumentId,
  PageId,
} from "@/features/documents/domain/document.types";

import type { AnnotationRepository } from "@/features/editor/repositories/annotation.repository";

import { validateAnnotation } from "@/features/editor/domain/annotation.rules";

export class DexieAnnotationRepository implements AnnotationRepository {
  private async touchDocument(documentId: DocumentId): Promise<void> {
    const document = await database.documents.get(documentId);

    if (!document || document.deletedAt) {
      throw new Error("Document not found.");
    }

    await database.documents.put({
      ...document,
      updatedAt: new Date().toISOString(),
      revision: document.revision + 1,
    });
  }

  async create(annotation: Annotation): Promise<void> {
    validateAnnotation(annotation);

    await database.transaction(
      "rw",
      database.annotations,
      database.documents,
      async () => {
        await this.touchDocument(annotation.documentId);
        await database.annotations.add(annotation);
      },
    );
  }

  async getById(id: AnnotationId): Promise<Annotation | null> {
    return (await database.annotations.get(id)) ?? null;
  }

  async getByDocumentId(documentId: DocumentId): Promise<Annotation[]> {
    return database.annotations
      .where("documentId")
      .equals(documentId)
      .toArray();
  }

  async getByPageId(pageId: PageId): Promise<Annotation[]> {
    return database.annotations.where("pageId").equals(pageId).toArray();
  }

  async update(id: AnnotationId, update: AnnotationUpdate): Promise<void> {
    await database.transaction(
      "rw",
      database.annotations,
      database.documents,
      async () => {
        const annotation = await database.annotations.get(id);

        if (!annotation) {
          throw new Error(`Annotation ${id} not found.`);
        }

        if (annotation.type !== update.type) {
          throw new Error("Annotation type mismatch.");
        }

        const updatedAnnotation = {
          ...annotation,
          ...update.changes,
          position: update.changes.position
            ? { ...annotation.position, ...update.changes.position }
            : annotation.position,
          style: update.changes.style
            ? { ...annotation.style, ...update.changes.style }
            : annotation.style,
          updatedAt: new Date().toISOString(),
        } as Annotation;

        validateAnnotation(updatedAnnotation);

        await this.touchDocument(annotation.documentId);
        await database.annotations.put(updatedAnnotation);
      },
    );
  }

  async replace(replacement: Annotation): Promise<void> {
    await database.transaction(
      "rw",
      database.annotations,
      database.documents,
      async () => {
        const current = await database.annotations.get(replacement.id);

        if (!current) {
          throw new Error(`Annotation ${replacement.id} not found.`);
        }

        if (
          current.documentId !== replacement.documentId ||
          current.pageId !== replacement.pageId
        ) {
          throw new Error(
            "Replacement must belong to the same document and page.",
          );
        }

        const updatedAnnotation: Annotation = {
          ...replacement,
          createdAt: current.createdAt,
          updatedAt: new Date().toISOString(),
        };

        validateAnnotation(updatedAnnotation);

        await this.touchDocument(current.documentId);
        await database.annotations.put(updatedAnnotation);
      },
    );
  }

  async delete(id: AnnotationId): Promise<void> {
    await database.transaction(
      "rw",
      database.annotations,
      database.documents,
      async () => {
        const annotation = await database.annotations.get(id);

        if (!annotation) return;

        await this.touchDocument(annotation.documentId);
        await database.annotations.delete(id);
      },
    );
  }

  async deleteByDocumentId(documentId: DocumentId): Promise<void> {
    await database.transaction(
      "rw",
      database.annotations,
      database.documents,
      async () => {
        const count = await database.annotations
          .where("documentId")
          .equals(documentId)
          .count();

        if (count === 0) return;

        await this.touchDocument(documentId);

        await database.annotations
          .where("documentId")
          .equals(documentId)
          .delete();
      },
    );
  }
}
