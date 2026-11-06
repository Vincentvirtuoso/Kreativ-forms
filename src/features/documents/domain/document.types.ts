export type DocumentId = string;
export type PageId = string;
export type AssetId = string;
export type CollectionId = string;

export type DocumentStatus = "draft" | "in_progress" | "completed";

export type DocumentPersistence = "local" | "session";

export type DocumentSyncStatus = "local" | "pending" | "synced" | "conflict";

export type DocumentAssetType =
  | "original_pdf"
  | "working_pdf"
  | "thumbnail"
  | "image";

export type PageRotation = 0 | 90 | 180 | 270;

export interface DocumentSyncMetadata {
  status: DocumentSyncStatus;
  lastSyncedAt?: string;
  serverRevision?: number;
}

export interface Document {
  id: DocumentId;
  name: string;
  status: DocumentStatus;

  sourceAssetId: AssetId;
  workingAssetId: AssetId;

  pageIds: PageId[];
  collectionId?: CollectionId;

  persistence: DocumentPersistence;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  revision: number;
  schemaVersion: number;

  sync: DocumentSyncMetadata;

  deletedAt?: string;
}

export interface DocumentPage {
  id: PageId;
  documentId: DocumentId;

  sourcePageNumber: number;
  order: number;

  rotation: PageRotation;

  width: number;
  height: number;

  thumbnailAssetId?: AssetId;
}

export interface DocumentAsset {
  id: AssetId;
  documentId: DocumentId;

  type: DocumentAssetType;
  mimeType: string;
  size: number;

  createdAt: string;
  checksum?: string;
}

export interface StoredDocumentAsset extends DocumentAsset {
  blob: Blob;
}

export interface CreateDocumentInput {
  name: string;
  sourceAssetId: AssetId;
  workingAssetId: AssetId;
  pageIds: PageId[];
  persistence: DocumentPersistence;
}

export type UpdateDocumentInput = Partial<
  Omit<Document, "id" | "revision" | "createdAt" | "schemaVersion" | "sync">
> & {
  collectionId?: string | null;
  completedAt?: string | null;
};
