import type {
  AssetId,
  DocumentAsset,
  StoredDocumentAsset,
} from "../../../domain/document.types";

import { documentAssetSchema } from "../../../domain/document.schema";
import type { AssetRepository } from "../../../repositories/asset.repository";

import { database } from "../database";

export class LocalAssetRepository implements AssetRepository {
  async create(asset: StoredDocumentAsset): Promise<void> {
    const { blob, ...metadata } = asset;

    documentAssetSchema.parse(metadata);

    if (!(blob instanceof Blob)) {
      throw new Error("Invalid asset: expected a Blob.");
    }

    if (blob.size !== asset.size) {
      throw new Error("Asset size does not match its stored Blob.");
    }

    await database.assets.add(asset);
  }

  async getById(id: AssetId): Promise<StoredDocumentAsset | null> {
    return (await database.assets.get(id)) ?? null;
  }

  async getMetadata(id: AssetId): Promise<DocumentAsset | null> {
    const asset = await this.getById(id);

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
