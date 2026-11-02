import {
  documentSchema,
  documentPageSchema,
  documentAssetSchema,
} from "@/features/documents/domain/document.schema";

import { validateDocumentPages } from "@/features/documents/domain/document.rules";

import type {
  DocumentCreationRepository,
  CreateDocumentRecord,
} from "@/features/documents/repositories/document-creation.repository";

import { database, type SyncOutboxEntry } from "../database";

function createOutboxEntry(
  entityType: SyncOutboxEntry["entityType"],
  entityId: string,
  revision: number,
  payload: unknown,
): SyncOutboxEntry {
  return {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    operation: "create",
    revision,
    createdAt: new Date().toISOString(),
    payload,
  };
}

function validateCreation(input: CreateDocumentRecord): void {
  const { document, pages, assets } = input;

  documentSchema.parse(document);

  if (document.persistence !== "local") {
    throw new Error(
      "IndexedDB creation only supports locally persisted documents.",
    );
  }

  if (pages.length === 0) {
    throw new Error("A document must contain at least one page.");
  }

  if (pages.length !== document.pageIds.length) {
    throw new Error("Document page references do not match its pages.");
  }

  const pageIds = new Set(pages.map((page) => page.id));

  if (
    pageIds.size !== pages.length ||
    document.pageIds.some((id) => !pageIds.has(id))
  ) {
    throw new Error("Document contains invalid or duplicate page references.");
  }

  validateDocumentPages(pages);

  for (const page of pages) {
    documentPageSchema.parse(page);

    if (page.documentId !== document.id) {
      throw new Error("A page belongs to a different document.");
    }
  }

  const assetIds = new Set(assets.map((asset) => asset.id));

  if (assetIds.size !== assets.length) {
    throw new Error("Duplicate asset IDs are not allowed.");
  }

  if (
    !assetIds.has(document.sourceAssetId) ||
    !assetIds.has(document.workingAssetId)
  ) {
    throw new Error("Document source or working asset is missing.");
  }

  const sourceAsset = assets.find(
    (asset) => asset.id === document.sourceAssetId,
  );

  const workingAsset = assets.find(
    (asset) => asset.id === document.workingAssetId,
  );

  if (sourceAsset?.type !== "original_pdf") {
    throw new Error("Invalid original PDF asset.");
  }

  if (workingAsset?.type !== "working_pdf") {
    throw new Error("Invalid working PDF asset.");
  }

  for (const asset of assets) {
    const { blob, ...metadata } = asset;

    documentAssetSchema.parse(metadata);

    if (asset.documentId !== document.id) {
      throw new Error("An asset belongs to a different document.");
    }

    if (!(blob instanceof Blob) || blob.size !== asset.size) {
      throw new Error(`Invalid Blob for asset ${asset.id}.`);
    }
  }

  for (const page of pages) {
    if (page.thumbnailAssetId && !assetIds.has(page.thumbnailAssetId)) {
      throw new Error(`Missing thumbnail asset for page ${page.id}.`);
    }
  }
}

export class LocalDocumentCreationRepository implements DocumentCreationRepository {
  async createWithAssets(input: CreateDocumentRecord): Promise<void> {
    validateCreation(input);

    const { document, pages, assets } = input;

    const outboxEntries: SyncOutboxEntry[] = [
      createOutboxEntry("document", document.id, document.revision, document),
      ...pages.map((page) =>
        createOutboxEntry("page", page.id, document.revision, page),
      ),
      ...assets.map(({ blob: _blob, ...metadata }) =>
        createOutboxEntry("asset", metadata.id, document.revision, metadata),
      ),
    ];

    await database.transaction(
      "rw",
      database.documents,
      database.pages,
      database.assets,
      database.outbox,
      async () => {
        await database.documents.add(document);
        await database.pages.bulkAdd(pages);
        await database.assets.bulkAdd(assets);
        await database.outbox.bulkAdd(outboxEntries);
      },
    );
  }
}
