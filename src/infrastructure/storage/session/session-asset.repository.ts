import type {
  AssetId,
  DocumentAsset,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import type { AssetRepository } from "@/features/documents/repositories/asset.repository";

import { documentAssetSchema } from "@/features/documents/domain/document.schema";
import { sessionDocumentState } from "./session-document.state";

export class SessionAssetRepository implements AssetRepository {
  async create(asset: StoredDocumentAsset): Promise<void> {
    const { blob, ...metadata } = asset;

    documentAssetSchema.parse(metadata);

    if (!(blob instanceof Blob) || blob.size !== asset.size) {
      throw new Error("Invalid asset Blob.");
    }

    if (!sessionDocumentState.documents.has(asset.documentId)) {
      throw new Error("Document not found.");
    }

    sessionDocumentState.assets.set(asset.id, structuredClone(asset));
  }

  async getById(id: AssetId): Promise<StoredDocumentAsset | null> {
    const asset = sessionDocumentState.assets.get(id);
    return asset ? structuredClone(asset) : null;
  }

  async getMetadata(id: AssetId): Promise<DocumentAsset | null> {
    const asset = sessionDocumentState.assets.get(id);

    if (!asset) return null;

    const { blob: _blob, ...metadata } = asset;
    return structuredClone(metadata);
  }

  async getByDocumentId(documentId: string): Promise<StoredDocumentAsset[]> {
    return [...sessionDocumentState.assets.values()]
      .filter((asset) => asset.documentId === documentId)
      .map((asset) => structuredClone(asset));
  }

  async delete(id: AssetId): Promise<void> {
    sessionDocumentState.assets.delete(id);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    for (const [id, asset] of sessionDocumentState.assets) {
      if (asset.documentId === documentId) {
        sessionDocumentState.assets.delete(id);
      }
    }
  }
}
