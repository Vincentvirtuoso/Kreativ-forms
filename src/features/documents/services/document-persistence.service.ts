import type { Annotation } from "@/features/editor/domain/annotation.types";

import type {
  Document,
  DocumentId,
  DocumentPage,
  DocumentAsset,
} from "../domain/document.types";
import { DocumentRepositories } from "../document-repository.factory";

export interface DocumentSaveSnapshot {
  document: Document;
  pages: DocumentPage[];
  annotations: Annotation[];
}

export class DocumentPersistenceService {
  constructor(private readonly repositories: DocumentRepositories) {}

  async save(
    documentId: DocumentId,
    flushAnnotations: () => Promise<void>,
  ): Promise<DocumentSaveSnapshot> {
    await flushAnnotations();

    const document = await this.repositories.documents.getById(documentId);

    if (!document || document.deletedAt) {
      throw new Error("Document not found or has been deleted.");
    }

    const [pages, annotations] = await Promise.all([
      this.repositories.pages.getByDocumentId(documentId),
      this.repositories.annotations.getByDocumentId(documentId),
    ]);

    this.validatePages(document, pages);

    const assetIds = new Set([
      document.sourceAssetId,
      document.workingAssetId,
      ...pages
        .map((page) => page.thumbnailAssetId)
        .filter((id): id is string => Boolean(id)),
    ]);

    const assetMetadata = await Promise.all(
      [...assetIds].map((id) => this.repositories.assets.getMetadata(id)),
    );

    const assets = new Map<string, DocumentAsset>();

    for (const asset of assetMetadata) {
      if (!asset) {
        throw new Error("A required document asset is missing.");
      }

      if (asset.documentId !== documentId) {
        throw new Error("Document asset ownership mismatch.");
      }

      assets.set(asset.id, asset);
    }

    if (!assets.has(document.sourceAssetId)) {
      throw new Error("Original document asset is missing.");
    }

    if (!assets.has(document.workingAssetId)) {
      throw new Error("Working document asset is missing.");
    }

    const pageIds = new Set(pages.map((page) => page.id));

    for (const annotation of annotations) {
      if (annotation.documentId !== documentId) {
        throw new Error("Annotation document reference mismatch.");
      }

      if (!pageIds.has(annotation.pageId)) {
        throw new Error(
          `Annotation ${annotation.id} references a missing page.`,
        );
      }
    }

    return {
      document,
      pages,
      annotations,
    };
  }

  private validatePages(document: Document, pages: DocumentPage[]): void {
    const expectedIds = new Set(document.pageIds);
    const actualIds = new Set(pages.map((page) => page.id));

    if (expectedIds.size !== document.pageIds.length) {
      throw new Error("Document contains duplicate page references.");
    }

    if (
      expectedIds.size !== actualIds.size ||
      [...expectedIds].some((id) => !actualIds.has(id))
    ) {
      throw new Error("Document page metadata is incomplete.");
    }

    for (const page of pages) {
      if (page.documentId !== document.id) {
        throw new Error("Document page ownership mismatch.");
      }
    }
  }
}
