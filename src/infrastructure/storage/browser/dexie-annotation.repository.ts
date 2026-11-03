import { database } from "./database";

import type {
  Annotation,
  AnnotationId,
  AnnotationUpdate,
} from "@/features/editor/domain/annotation.types";

export class DexieAnnotationRepository {
  async create(annotation: Annotation): Promise<void> {
    await database.annotations.add(annotation);
  }

  async getById(id: AnnotationId): Promise<Annotation | null> {
    return (await database.annotations.get(id)) ?? null;
  }

  async getByDocumentId(documentId: string): Promise<Annotation[]> {
    return database.annotations
      .where("documentId")
      .equals(documentId)
      .toArray();
  }

  async getByPageId(pageId: string): Promise<Annotation[]> {
    return database.annotations.where("pageId").equals(pageId).toArray();
  }

  async update(id: AnnotationId, update: AnnotationUpdate): Promise<void> {
    await database.transaction("rw", database.annotations, async () => {
      const annotation = await database.annotations.get(id);

      if (!annotation) {
        throw new Error(`Annotation ${id} not found.`);
      }

      if (annotation.type !== update.type) {
        throw new Error("Annotation type mismatch.");
      }

      await database.annotations.put({
        ...annotation,
        ...update.changes,
        updatedAt: new Date().toISOString(),
      } as Annotation);
    });
  }

  async delete(id: AnnotationId): Promise<void> {
    await database.annotations.delete(id);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await database.annotations.where("documentId").equals(documentId).delete();
  }
}
