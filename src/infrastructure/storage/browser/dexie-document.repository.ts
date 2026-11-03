import { database } from "./database";

import type {
  Document,
  DocumentId,
} from "@/features/documents/domain/document.types";

import type { DocumentRepository } from "@/features/documents/repositories/document.repository";

import type { UpdateDocumentInput } from "@/features/documents/domain/document.types";

export class DexieDocumentRepository implements DocumentRepository {
  async getById(id: DocumentId): Promise<Document | null> {
    const document = await database.documents.get(id);

    if (!document || document.deletedAt) return null;

    return document;
  }

  async getAll(): Promise<Document[]> {
    const documents = await database.documents.toArray();

    return documents
      .filter((document) => !document.deletedAt)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  async update(id: DocumentId, changes: UpdateDocumentInput): Promise<void> {
    await database.transaction("rw", database.documents, async () => {
      const document = await database.documents.get(id);

      if (!document || document.deletedAt) {
        throw new Error("Document not found.");
      }

      const normalizedChanges = {
        ...changes,
        collectionId:
          changes.collectionId === null ? undefined : changes.collectionId,
        completedAt:
          changes.completedAt === null ? undefined : changes.completedAt,
      };

      const updatedDocument: Document = {
        ...document,
        ...normalizedChanges,
        id: document.id,
        updatedAt: new Date().toISOString(),
        revision: document.revision + 1,
      };

      await database.documents.put(updatedDocument);
    });
  }

  async softDelete(id: DocumentId): Promise<void> {
    await database.transaction("rw", database.documents, async () => {
      const document = await database.documents.get(id);

      if (!document || document.deletedAt) {
        throw new Error("Document not found.");
      }

      const now = new Date().toISOString();

      await database.documents.put({
        ...document,
        deletedAt: now,
        updatedAt: now,
        revision: document.revision + 1,
      });
    });
  }

  async restore(id: DocumentId): Promise<void> {
    await database.transaction("rw", database.documents, async () => {
      const document = await database.documents.get(id);

      if (!document || !document.deletedAt) {
        throw new Error("Trashed document not found.");
      }

      const { deletedAt: _deletedAt, ...rest } = document;

      await database.documents.put({
        ...rest,
        updatedAt: new Date().toISOString(),
        revision: document.revision + 1,
      });
    });
  }

  async permanentlyDelete(id: DocumentId): Promise<void> {
    await database.transaction(
      "rw",
      [
        database.documents,
        database.pages,
        database.assets,
        database.annotations,
      ],
      async () => {
        await database.documents.delete(id);

        await database.pages.where("documentId").equals(id).delete();

        await database.assets.where("documentId").equals(id).delete();

        await database.annotations.where("documentId").equals(id).delete();
      },
    );
  }

  async getTrash(): Promise<Document[]> {
    const documents = await database.documents.toArray();

    return documents
      .filter((document) => Boolean(document.deletedAt))
      .sort(
        (a, b) =>
          new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime(),
      );
  }
}
