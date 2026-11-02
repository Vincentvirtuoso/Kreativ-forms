import {
  documentSchema,
  documentPageSchema,
  documentAssetSchema,
} from "@/features/documents/domain/document.schema";

import { validateDocumentPages } from "@/features/documents/domain/document.rules";

import type {
  CreateDocumentRecord,
  DocumentCreationRepository,
} from "@/features/documents/repositories/document-creation.repository";

import { sessionDocumentState } from "./session-document.state";

export class SessionDocumentCreationRepository implements DocumentCreationRepository {
  async createWithAssets(input: CreateDocumentRecord): Promise<void> {
    const { document, pages, assets } = input;

    const validatedDocument = documentSchema.parse({
      ...document,
      sync: { ...document.sync, status: "local" },
    });

    if (validatedDocument.persistence !== "session") {
      throw new Error("Expected a session document.");
    }

    if (!pages.length) {
      throw new Error("A document must have at least one page.");
    }

    validateDocumentPages(pages);

    const pageIds = new Set(pages.map((page) => page.id));
    const assetIds = new Set(assets.map((asset) => asset.id));

    if (
      pageIds.size !== pages.length ||
      pageIds.size !== document.pageIds.length ||
      document.pageIds.some((id) => !pageIds.has(id))
    ) {
      throw new Error("Invalid document page references.");
    }

    if (assetIds.size !== assets.length) {
      throw new Error("Duplicate asset IDs.");
    }

    if (
      !assetIds.has(document.sourceAssetId) ||
      !assetIds.has(document.workingAssetId)
    ) {
      throw new Error("Missing source or working PDF.");
    }

    for (const page of pages) {
      documentPageSchema.parse(page);

      if (page.documentId !== document.id) {
        throw new Error("Page belongs to a different document.");
      }

      if (page.thumbnailAssetId && !assetIds.has(page.thumbnailAssetId)) {
        throw new Error(`Missing thumbnail for page ${page.id}.`);
      }
    }

    for (const asset of assets) {
      const { blob, ...metadata } = asset;

      documentAssetSchema.parse(metadata);

      if (
        asset.documentId !== document.id ||
        !(blob instanceof Blob) ||
        blob.size !== asset.size
      ) {
        throw new Error(`Invalid asset ${asset.id}.`);
      }
    }

    if (sessionDocumentState.documents.has(document.id)) {
      throw new Error("Document already exists.");
    }

    for (const page of pages) {
      if (sessionDocumentState.pages.has(page.id)) {
        throw new Error(`Page already exists: ${page.id}`);
      }
    }

    for (const asset of assets) {
      if (sessionDocumentState.assets.has(asset.id)) {
        throw new Error(`Asset already exists: ${asset.id}`);
      }
    }

    // Validation is complete before any records are written.
    sessionDocumentState.documents.set(
      document.id,
      structuredClone(validatedDocument),
    );

    for (const page of pages) {
      sessionDocumentState.pages.set(page.id, structuredClone(page));
    }

    for (const asset of assets) {
      sessionDocumentState.assets.set(asset.id, structuredClone(asset));
    }
  }
}
