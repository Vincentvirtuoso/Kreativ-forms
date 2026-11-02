import type {
  Document,
  DocumentId,
  UpdateDocumentInput,
} from "../domain/document.types";

export interface DocumentRepository {
  getById(id: DocumentId): Promise<Document | null>;
  getAll(): Promise<Document[]>;
  update(id: DocumentId, changes: UpdateDocumentInput): Promise<void>;
  softDelete(id: DocumentId): Promise<void>;
  restore(id: DocumentId): Promise<void>;
  permanentlyDelete(id: DocumentId): Promise<void>;
  getTrash(): Promise<Document[]>;
}