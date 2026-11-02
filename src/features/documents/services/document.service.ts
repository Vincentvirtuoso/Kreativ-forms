import type {
  Document,
  DocumentId,
  UpdateDocumentInput,
} from "../domain/document.types";

import type { DocumentRepository } from "../repositories/document.repository";

import { validateDocumentUpdate } from "../domain/document.rules";

export class DocumentService {
  constructor(private readonly documents: DocumentRepository) {}

  async getDocument(id: DocumentId): Promise<Document> {
    const document = await this.documents.getById(id);

    if (!document || document.deletedAt) {
      throw new Error("Document not found.");
    }

    return document;
  }

  async listDocuments(): Promise<Document[]> {
    return this.documents.getAll();
  }

  async updateDocument(
    id: DocumentId,
    input: UpdateDocumentInput,
  ): Promise<void> {
    const document = await this.getDocument(id);

    validateDocumentUpdate(document, input);

    const changes: UpdateDocumentInput = {};

    if (input.name !== undefined) {
      changes.name = input.name.trim();
    }

    if (input.status !== undefined) {
      changes.status = input.status;
    }

    if (input.collectionId !== undefined) {
      changes.collectionId = input.collectionId;
    }

    if (input.completedAt !== undefined) {
      changes.completedAt = input.completedAt;
    }

    await this.documents.update(id, changes);
  }

  async moveToTrash(id: DocumentId): Promise<void> {
    await this.getDocument(id);
    await this.documents.softDelete(id);
  }

  async restoreDocument(id: DocumentId): Promise<void> {
    const document = await this.documents.getById(id);

    if (!document?.deletedAt) {
      throw new Error("Deleted document not found.");
    }

    await this.documents.restore(id);
  }

  async permanentlyDeleteDocument(id: DocumentId): Promise<void> {
    const document = await this.documents.getById(id);

    if (!document) {
      throw new Error("Document not found.");
    }

    await this.documents.permanentlyDelete(id);
  }

  async listTrash(): Promise<Document[]> {
    return this.documents.getTrash();
  }
}
