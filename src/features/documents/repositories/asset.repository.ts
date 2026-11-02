import type {
  AssetId,
  DocumentAsset,
  StoredDocumentAsset,
} from "../domain/document.types";

export interface AssetRepository {
  create(asset: StoredDocumentAsset): Promise<void>;

  getById(id: AssetId): Promise<StoredDocumentAsset | null>;

  getMetadata(id: AssetId): Promise<DocumentAsset | null>;

  getByDocumentId(documentId: string): Promise<StoredDocumentAsset[]>;

  delete(id: AssetId): Promise<void>;

  deleteByDocumentId(documentId: string): Promise<void>;
}
