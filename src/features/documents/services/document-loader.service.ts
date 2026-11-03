import type { DocumentId, StoredDocumentAsset } from "../domain/document.types";

import type { DocumentRepository } from "../repositories/document.repository";
import type { AssetRepository } from "../repositories/asset.repository";
import type { PageRepository } from "../repositories/page.repository";

import type { DocumentWorkspace } from "./document-workspace.types";

export class DocumentLoaderService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly assets: AssetRepository,
    private readonly pages: PageRepository,
  ) {}

  async load(documentId: DocumentId): Promise<DocumentWorkspace> {
    const document = await this.documents.getById(documentId);

    if (!document || document.deletedAt) {
      throw new Error("Document not found.");
    }

    const [assets, pages] = await Promise.all([
      this.assets.getByDocumentId(documentId),
      this.pages.getByDocumentId(documentId),
    ]);

    const originalPdf = this.findAsset(
      assets,
      document.sourceAssetId,
      "original_pdf",
    );

    const workingPdf = this.findAsset(
      assets,
      document.workingAssetId,
      "working_pdf",
    );

    const orderedPages = [...pages].sort((a, b) => a.order - b.order);

    this.validatePages(document.pageIds, orderedPages);

    return {
      document,
      assets,
      pages: orderedPages,
      originalPdf,
      workingPdf,
    };
  }

  private findAsset(
    assets: StoredDocumentAsset[],
    id: string,
    expectedType: StoredDocumentAsset["type"],
  ): StoredDocumentAsset {
    const asset = assets.find((item) => item.id === id);

    if (!asset || asset.type !== expectedType) {
      throw new Error(`Required ${expectedType} asset is missing.`);
    }

    return asset;
  }

  private validatePages(
    pageIds: string[],
    pages: DocumentWorkspace["pages"],
  ): void {
    if (
      pageIds.length !== pages.length ||
      new Set(pageIds).size !== pageIds.length
    ) {
      throw new Error("Document page references are inconsistent.");
    }

    const loadedIds = new Set(pages.map((page) => page.id));

    if (pageIds.some((id) => !loadedIds.has(id))) {
      throw new Error("One or more document pages could not be loaded.");
    }

    if (pages.some((page, index) => page.order !== index)) {
      throw new Error("Document page ordering is invalid.");
    }
  }
}
