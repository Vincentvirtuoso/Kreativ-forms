import { beforeEach, describe, expect, it } from "vitest";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import type { CreateDocumentRecord } from "@/features/documents/repositories/document-creation.repository";

import { SessionDocumentCreationRepository } from "../session-document-creation.repository";
import { sessionDocumentState } from "../session-document.state";

describe("SessionDocumentCreationRepository", () => {
  let repository: SessionDocumentCreationRepository;

  const createDocument = (overrides: Partial<Document> = {}): Document => ({
    id: "document-1",
    name: "Test Document",
    status: "draft",
    sourceAssetId: "asset-original",
    workingAssetId: "asset-working",
    pageIds: ["page-1", "page-2"],
    persistence: "session",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    revision: 1,
    schemaVersion: 1,
    sync: { status: "local" },
    ...overrides,
  });

  const createPage = (overrides: Partial<DocumentPage> = {}): DocumentPage => ({
    id: "page-1",
    documentId: "document-1",
    sourcePageNumber: 1,
    order: 0,
    rotation: 0,
    width: 595,
    height: 842,
    ...overrides,
  });

  const createAsset = (
    overrides: Partial<StoredDocumentAsset> = {},
  ): StoredDocumentAsset => {
    const blob = new Blob(["test PDF"], {
      type: "application/pdf",
    });

    return {
      id: "asset-original",
      documentId: "document-1",
      type: "original_pdf",
      mimeType: "application/pdf",
      size: blob.size,
      createdAt: "2026-11-01T10:00:00.000Z",
      blob,
      ...overrides,
    };
  };

  const createInput = (
    overrides: Partial<CreateDocumentRecord> = {},
  ): CreateDocumentRecord => ({
    document: createDocument(),
    pages: [
      createPage(),
      createPage({
        id: "page-2",
        sourcePageNumber: 2,
        order: 1,
      }),
    ],
    assets: [
      createAsset(),
      createAsset({
        id: "asset-working",
        type: "working_pdf",
      }),
    ],
    ...overrides,
  });

  const expectStoreEmpty = () => {
    expect(sessionDocumentState.documents.size).toBe(0);
    expect(sessionDocumentState.pages.size).toBe(0);
    expect(sessionDocumentState.assets.size).toBe(0);
  };

  beforeEach(() => {
    sessionDocumentState.documents.clear();
    sessionDocumentState.pages.clear();
    sessionDocumentState.assets.clear();

    repository = new SessionDocumentCreationRepository();
  });

  describe("successful creation", () => {
    it("creates a document with its pages and assets", async () => {
      const input = createInput();

      await repository.createWithAssets(input);

      expect(sessionDocumentState.documents.size).toBe(1);
      expect(sessionDocumentState.pages.size).toBe(2);
      expect(sessionDocumentState.assets.size).toBe(2);
    });

    it("stores the document using its ID", async () => {
      const input = createInput();

      await repository.createWithAssets(input);

      expect(sessionDocumentState.documents.has(input.document.id)).toBe(true);
    });

    it("stores all pages using their IDs", async () => {
      const input = createInput();

      await repository.createWithAssets(input);

      for (const page of input.pages) {
        expect(sessionDocumentState.pages.has(page.id)).toBe(true);
      }
    });

    it("stores all assets using their IDs", async () => {
      const input = createInput();

      await repository.createWithAssets(input);

      for (const asset of input.assets) {
        expect(sessionDocumentState.assets.has(asset.id)).toBe(true);
      }
    });

    it("forces the document sync status to local", async () => {
      const input = createInput({
        document: createDocument({
          sync: { status: "synced" },
        }),
      });

      await repository.createWithAssets(input);

      expect(
        sessionDocumentState.documents.get("document-1")?.sync.status,
      ).toBe("local");
    });

    it("preserves the original input objects", async () => {
      const input = createInput();
      const originalDocument = structuredClone(input.document);

      await repository.createWithAssets(input);

      expect(input.document).toEqual(originalDocument);
    });

    it("stores cloned document, page and asset objects", async () => {
      const input = createInput();

      await repository.createWithAssets(input);

      expect(sessionDocumentState.documents.get("document-1")).not.toBe(
        input.document,
      );

      expect(sessionDocumentState.pages.get("page-1")).not.toBe(input.pages[0]);

      expect(sessionDocumentState.assets.get("asset-original")).not.toBe(
        input.assets[0],
      );
    });

    it("preserves the asset Blob", async () => {
      const input = createInput();

      await repository.createWithAssets(input);

      const storedAsset = sessionDocumentState.assets.get("asset-original");

      expect(storedAsset?.blob).toBeInstanceOf(Blob);
      expect(storedAsset?.blob.size).toBe(input.assets[0].blob.size);
    });
  });

  describe("document validation", () => {
    it("rejects documents with invalid schema data", async () => {
      const input = createInput({
        document: createDocument({ revision: -1 }),
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow();

      expectStoreEmpty();
    });

    it("rejects documents that use local persistence", async () => {
      const input = createInput({
        document: createDocument({ persistence: "local" }),
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Expected a session document.",
      );

      expectStoreEmpty();
    });

    it("rejects documents without pages", async () => {
      const input = createInput({
        document: createDocument({ pageIds: [] }),
        pages: [],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "A document must have at least one page.",
      );

      expectStoreEmpty();
    });

    it("rejects documents with missing page references", async () => {
      const input = createInput({
        document: createDocument({
          pageIds: ["page-1", "missing-page"],
        }),
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Invalid document page references.",
      );

      expectStoreEmpty();
    });

    it("rejects pages not referenced by the document", async () => {
      const input = createInput({
        document: createDocument({
          pageIds: ["page-1"],
        }),
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Invalid document page references.",
      );

      expectStoreEmpty();
    });
  });

  describe("page validation", () => {
    it("rejects duplicate page IDs", async () => {
      const input = createInput({
        pages: [createPage(), createPage({ sourcePageNumber: 2, order: 1 })],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Duplicate page ID",
      );

      expectStoreEmpty();
    });

    it("rejects duplicate page order values", async () => {
      const input = createInput({
        pages: [
          createPage(),
          createPage({
            id: "page-2",
            sourcePageNumber: 2,
            order: 0,
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Duplicate page order",
      );

      expectStoreEmpty();
    });

    it("rejects pages with invalid dimensions", async () => {
      const input = createInput({
        pages: [
          createPage({ width: 0 }),
          createPage({
            id: "page-2",
            sourcePageNumber: 2,
            order: 1,
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Invalid dimensions",
      );

      expectStoreEmpty();
    });

    it("rejects pages belonging to another document", async () => {
      const input = createInput({
        pages: [
          createPage({ documentId: "another-document" }),
          createPage({
            id: "page-2",
            sourcePageNumber: 2,
            order: 1,
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Page belongs to a different document.",
      );

      expectStoreEmpty();
    });

    it("rejects pages with missing thumbnail assets", async () => {
      const input = createInput({
        pages: [
          createPage({ thumbnailAssetId: "missing-thumbnail" }),
          createPage({
            id: "page-2",
            sourcePageNumber: 2,
            order: 1,
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Missing thumbnail for page page-1.",
      );

      expectStoreEmpty();
    });
  });

  describe("asset validation", () => {
    it("rejects duplicate asset IDs", async () => {
      const input = createInput({
        assets: [createAsset(), createAsset({ type: "working_pdf" })],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Duplicate asset IDs.",
      );

      expectStoreEmpty();
    });

    it("rejects missing source PDF assets", async () => {
      const input = createInput({
        document: createDocument({
          sourceAssetId: "missing-source",
        }),
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Missing source or working PDF.",
      );

      expectStoreEmpty();
    });

    it("rejects missing working PDF assets", async () => {
      const input = createInput({
        document: createDocument({
          workingAssetId: "missing-working",
        }),
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Missing source or working PDF.",
      );

      expectStoreEmpty();
    });

    it("rejects assets belonging to another document", async () => {
      const input = createInput({
        assets: [
          createAsset({ documentId: "another-document" }),
          createAsset({
            id: "asset-working",
            type: "working_pdf",
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Invalid asset asset-original.",
      );

      expectStoreEmpty();
    });

    it("rejects assets whose Blob size does not match metadata", async () => {
      const input = createInput({
        assets: [
          createAsset({ size: 999 }),
          createAsset({
            id: "asset-working",
            type: "working_pdf",
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Invalid asset asset-original.",
      );

      expectStoreEmpty();
    });

    it("rejects assets without a Blob", async () => {
      const invalidAsset = {
        ...createAsset(),
        blob: null,
      } as unknown as StoredDocumentAsset;

      const input = createInput({
        assets: [
          invalidAsset,
          createAsset({
            id: "asset-working",
            type: "working_pdf",
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow(
        "Invalid asset asset-original.",
      );

      expectStoreEmpty();
    });
  });

  describe("duplicate records", () => {
    it("rejects an existing document ID", async () => {
      sessionDocumentState.documents.set("document-1", createDocument());

      await expect(repository.createWithAssets(createInput())).rejects.toThrow(
        "Document already exists.",
      );

      expect(sessionDocumentState.pages.size).toBe(0);
      expect(sessionDocumentState.assets.size).toBe(0);
    });

    it("rejects an existing page ID", async () => {
      sessionDocumentState.pages.set("page-1", createPage());

      await expect(repository.createWithAssets(createInput())).rejects.toThrow(
        "Page already exists: page-1",
      );

      expect(sessionDocumentState.documents.size).toBe(0);
      expect(sessionDocumentState.assets.size).toBe(0);
    });

    it("rejects an existing asset ID", async () => {
      sessionDocumentState.assets.set("asset-original", createAsset());

      await expect(repository.createWithAssets(createInput())).rejects.toThrow(
        "Asset already exists: asset-original",
      );

      expect(sessionDocumentState.documents.size).toBe(0);
      expect(sessionDocumentState.pages.size).toBe(0);
    });
  });

  describe("atomicity", () => {
    it("does not write any records when validation fails", async () => {
      const input = createInput({
        pages: [
          createPage(),
          createPage({
            id: "page-2",
            sourcePageNumber: 2,
            order: 0,
          }),
        ],
      });

      await expect(repository.createWithAssets(input)).rejects.toThrow();

      expectStoreEmpty();
    });

    it("does not partially create records when a duplicate page exists", async () => {
      sessionDocumentState.pages.set(
        "page-2",
        createPage({
          id: "page-2",
          order: 1,
          sourcePageNumber: 2,
        }),
      );

      await expect(repository.createWithAssets(createInput())).rejects.toThrow(
        "Page already exists: page-2",
      );

      expect(sessionDocumentState.documents.size).toBe(0);
      expect(sessionDocumentState.pages.size).toBe(1);
      expect(sessionDocumentState.assets.size).toBe(0);
    });
  });
});
