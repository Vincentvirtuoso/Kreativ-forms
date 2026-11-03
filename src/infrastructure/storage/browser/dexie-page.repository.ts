import { database } from "./database";

import type {
  DocumentId,
  DocumentPage,
  PageId,
} from "@/features/documents/domain/document.types";

import type { PageRepository } from "@/features/documents/repositories/page.repository";

export class DexiePageRepository implements PageRepository {
  async createMany(pages: DocumentPage[]): Promise<void> {
    if (!pages.length) return;

    await database.pages.bulkAdd(pages);
  }

  async getById(id: PageId): Promise<DocumentPage | null> {
    return (await database.pages.get(id)) ?? null;
  }

  async getByDocumentId(documentId: DocumentId): Promise<DocumentPage[]> {
    return database.pages
      .where("documentId")
      .equals(documentId)
      .sortBy("order");
  }

  async updateMany(pages: DocumentPage[]): Promise<void> {
    if (!pages.length) return;

    await database.pages.bulkPut(pages);
  }

  async delete(id: PageId): Promise<void> {
    await database.pages.delete(id);
  }

  async deleteByDocumentId(documentId: DocumentId): Promise<void> {
    await database.pages.where("documentId").equals(documentId).delete();
  }

  async countByDocumentId(documentId: DocumentId): Promise<number> {
    return database.pages.where("documentId").equals(documentId).count();
  }
}
