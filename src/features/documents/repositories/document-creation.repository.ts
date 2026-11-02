import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "../domain/document.types";

export interface CreateDocumentRecord {
  document: Document;
  pages: DocumentPage[];
  assets: StoredDocumentAsset[];
}

export interface DocumentCreationRepository {
  createWithAssets(input: CreateDocumentRecord): Promise<void>;
}
