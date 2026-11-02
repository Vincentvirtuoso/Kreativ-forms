import type {
  DocumentId,
  DocumentPage,
  PageId,
} from "../../../features/documents/domain/document.types";

import type { PageRepository } from "../../../features/documents/repositories/page.repository";

import { documentPageSchema } from "../../../features/documents/domain/document.schema";
import { validateDocumentPages } from "../../../features/documents/domain/document.rules";
import { sessionDocumentState } from "./session-document.state";

export class SessionPageRepository implements PageRepository {
  async createMany(pages: DocumentPage[]): Promise<void> {
    validateDocumentPages(pages);

    for (const page of pages) {
      documentPageSchema.parse(page);

      if (!sessionDocumentState.documents.has(page.documentId)) {
        throw new Error("Document not found.");
      }

      if (sessionDocumentState.pages.has(page.id)) {
        throw new Error(`Page already exists: ${page.id}`);
      }
    }

    for (const page of pages) {
      sessionDocumentState.pages.set(page.id, structuredClone(page));
    }
  }

  async getById(id: PageId): Promise<DocumentPage | null> {
    const page = sessionDocumentState.pages.get(id);
    return page ? structuredClone(page) : null;
  }

  async getByDocumentId(documentId: DocumentId): Promise<DocumentPage[]> {
    return [...sessionDocumentState.pages.values()]
      .filter((page) => page.documentId === documentId)
      .sort((a, b) => a.order - b.order)
      .map((page) => structuredClone(page));
  }

  async updateMany(pages: DocumentPage[]): Promise<void> {
    validateDocumentPages(pages);

    for (const page of pages) {
      documentPageSchema.parse(page);

      if (!sessionDocumentState.pages.has(page.id)) {
        throw new Error(`Page not found: ${page.id}`);
      }
    }

    for (const page of pages) {
      sessionDocumentState.pages.set(page.id, structuredClone(page));
    }
  }

  async delete(id: PageId): Promise<void> {
    sessionDocumentState.pages.delete(id);
  }

  async deleteByDocumentId(documentId: DocumentId): Promise<void> {
    for (const [id, page] of sessionDocumentState.pages) {
      if (page.documentId === documentId) {
        sessionDocumentState.pages.delete(id);
      }
    }
  }

  async countByDocumentId(documentId: DocumentId): Promise<number> {
    return [...sessionDocumentState.pages.values()].filter(
      (page) => page.documentId === documentId,
    ).length;
  }
}
