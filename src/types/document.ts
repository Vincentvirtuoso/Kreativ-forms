export type DocumentStatus = "draft" | "in_progress" | "completed";

export type DocumentPersistence = "local" | "session";

export interface Document {
  id: string;
  name: string;
  status: DocumentStatus;

  sourceAssetId: string;
  workingAssetId: string;

  pageIds: string[];

  persistence: DocumentPersistence;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  revision: number;
  schemaVersion: number;

  sync: {
    status: "local" | "pending" | "synced" | "conflict";
    lastSyncedAt?: string;
    serverRevision?: number;
  };

  deletedAt?: string;
}


export interface DocumentPage {
  id: string;
  documentId: string;

  sourcePageNumber: number;
  order: number;

  rotation: 0 | 90 | 180 | 270;

  width: number;
  height: number;

  thumbnailAssetId?: string;
}