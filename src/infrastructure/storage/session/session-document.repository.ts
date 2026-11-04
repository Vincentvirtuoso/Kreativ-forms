import type {
  Document,
  DocumentId,
  UpdateDocumentInput,
} from "../../../features/documents/domain/document.types";

import { documentSchema } from "../../../features/documents/domain/document.schema";

import type { DocumentRepository } from "../../../features/documents/repositories/document.repository";

import { sessionDocumentState } from "./session-document.state";

export class SessionDocumentRepository implements DocumentRepository {
  async getById(id: DocumentId): Promise<Document | null> {
    const document = sessionDocumentState.documents.get(id);
    return document ? structuredClone(document) : null;
  }

  async getAll(): Promise<Document[]> {
    return [...sessionDocumentState.documents.values()]
      .filter((document) => !document.deletedAt)
      .map((document) => structuredClone(document));
  }

  async update(id: DocumentId, changes: UpdateDocumentInput): Promise<void> {
    const current = sessionDocumentState.documents.get(id);

    if (!current || current.deletedAt) {
      throw new Error("Document not found.");
    }

    const next = structuredClone(current);

    if (changes.name !== undefined) next.name = changes.name;
    if (changes.status !== undefined) next.status = changes.status;

    if (changes.collectionId === null) {
      delete next.collectionId;
    } else if (changes.collectionId !== undefined) {
      next.collectionId = changes.collectionId;
    }

    if (changes.completedAt === null) {
      delete next.completedAt;
    } else if (changes.completedAt !== undefined) {
      next.completedAt = changes.completedAt;
    }

    next.revision += 1;
    next.updatedAt = new Date().toISOString();
    next.sync = { ...next.sync, status: "local" };

    sessionDocumentState.documents.set(id, documentSchema.parse(next));
  }

  async softDelete(id: DocumentId): Promise<void> {
    const current = sessionDocumentState.documents.get(id);

    if (!current) throw new Error("Document not found.");
    if (current.deletedAt) return;

    const now = new Date().toISOString();

    sessionDocumentState.documents.set(
      id,
      documentSchema.parse({
        ...current,
        deletedAt: now,
        updatedAt: now,
        revision: current.revision + 1,
      }),
    );
  }

  async restore(id: DocumentId): Promise<void> {
    const current = sessionDocumentState.documents.get(id);

    if (!current?.deletedAt) {
      throw new Error("Deleted document not found.");
    }

    const { deletedAt: _deletedAt, ...restored } = current;

    sessionDocumentState.documents.set(
      id,
      documentSchema.parse({
        ...restored,
        updatedAt: new Date().toISOString(),
        revision: current.revision + 1,
      }),
    );
  }

  async permanentlyDelete(id: DocumentId): Promise<void> {
    const current = sessionDocumentState.documents.get(id);

    if (!current) {
      throw new Error("Document not found.");
    }

    if (!current.deletedAt) {
      throw new Error("Document must be in trash before permanent deletion.");
    }

    for (const [annotationId, annotation] of sessionDocumentState.annotations) {
      if (annotation.documentId === id) {
        sessionDocumentState.annotations.delete(annotationId);
      }
    }

    for (const [pageId, page] of sessionDocumentState.pages) {
      if (page.documentId === id) {
        sessionDocumentState.pages.delete(pageId);
      }
    }

    for (const [assetId, asset] of sessionDocumentState.assets) {
      if (asset.documentId === id) {
        sessionDocumentState.assets.delete(assetId);
      }
    }

    sessionDocumentState.documents.delete(id);
  }

  async getTrash(): Promise<Document[]> {
    return [...sessionDocumentState.documents.values()]
      .filter((document) => Boolean(document.deletedAt))
      .map((document) => structuredClone(document));
  }
}
