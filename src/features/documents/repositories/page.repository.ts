import type {
  DocumentId,
  DocumentPage,
  PageId,
} from "../domain/document.types";

export interface PageRepository {
  createMany(pages: DocumentPage[]): Promise<void>;

  getById(id: PageId): Promise<DocumentPage | null>;

  getByDocumentId(documentId: DocumentId): Promise<DocumentPage[]>;

  updateMany(pages: DocumentPage[]): Promise<void>;

  delete(id: PageId): Promise<void>;

  deleteByDocumentId(documentId: DocumentId): Promise<void>;

  countByDocumentId(documentId: DocumentId): Promise<number>;
}
