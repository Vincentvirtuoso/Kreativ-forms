import { database } from "@/features/documents/infrastructure/database/database";

import type {
  AssetId,
  DocumentAsset,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import type { AssetRepository } from "@/features/documents/repositories/asset.repository";

export class DexieAssetRepository implements AssetRepository {
  async create(asset: StoredDocumentAsset): Promise<void> {
    await database.assets.add(asset);
  }

  async getById(id: AssetId): Promise<StoredDocumentAsset | null> {
    return (await database.assets.get(id)) ?? null;
  }

  async getMetadata(id: AssetId): Promise<DocumentAsset | null> {
    const asset = await database.assets.get(id);

    if (!asset) return null;

    const { blob: _blob, ...metadata } = asset;

    return metadata;
  }

  async getByDocumentId(documentId: string): Promise<StoredDocumentAsset[]> {
    return database.assets.where("documentId").equals(documentId).toArray();
  }

  async delete(id: AssetId): Promise<void> {
    await database.assets.delete(id);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await database.assets.where("documentId").equals(documentId).delete();
  }
}
