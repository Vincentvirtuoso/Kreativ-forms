import { beforeEach, describe, expect, it } from "vitest";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "../../../../features/documents/domain/document.types";

import { SessionDocumentRepository } from "../session-document.repository";
import { sessionDocumentState } from "../session-document.state";

describe("SessionDocumentRepository", () => {
  let repository: SessionDocumentRepository;

  const createDocument = (overrides: Partial<Document> = {}): Document => ({
    id: "document-1",
    name: "Test Document",
    status: "draft",
    sourceAssetId: "asset-original",
    workingAssetId: "asset-working",
    pageIds: ["page-1"],
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
  ): StoredDocumentAsset => ({
    id: "asset-original",
    documentId: "document-1",
    type: "original_pdf",
    mimeType: "application/pdf",
    size: 1024,
    createdAt: "2026-11-01T10:00:00.000Z",
    blob: new Blob(["test PDF"], { type: "application/pdf" }),
    ...overrides,
  });

  beforeEach(() => {
    sessionDocumentState.documents.clear();
    sessionDocumentState.pages.clear();
    sessionDocumentState.assets.clear();

    repository = new SessionDocumentRepository();
  });

  describe("getById", () => {
    it("returns null when the document does not exist", async () => {
      await expect(repository.getById("missing")).resolves.toBeNull();
    });

    it("returns an existing document", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await expect(repository.getById(document.id)).resolves.toEqual(document);
    });

    it("returns a clone instead of the stored reference", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      const result = await repository.getById(document.id);

      expect(result).not.toBe(document);
      expect(result).toEqual(document);
    });
  });

  describe("getAll", () => {
    it("returns all active documents", async () => {
      const first = createDocument();
      const second = createDocument({
        id: "document-2",
        name: "Second Document",
      });

      sessionDocumentState.documents.set(first.id, first);
      sessionDocumentState.documents.set(second.id, second);

      const result = await repository.getAll();

      expect(result).toHaveLength(2);
      expect(result.map((document) => document.id)).toEqual([
        "document-1",
        "document-2",
      ]);
    });

    it("excludes deleted documents", async () => {
      const active = createDocument();
      const deleted = createDocument({
        id: "document-2",
        deletedAt: "2026-11-02T10:00:00.000Z",
      });

      sessionDocumentState.documents.set(active.id, active);
      sessionDocumentState.documents.set(deleted.id, deleted);

      const result = await repository.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(active.id);
    });
  });

  describe("update", () => {
    it("updates document properties", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await repository.update(document.id, {
        name: "Updated Document",
        status: "in_progress",
      });

      const result = await repository.getById(document.id);

      expect(result?.name).toBe("Updated Document");
      expect(result?.status).toBe("in_progress");
    });

    it("increments the revision", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await repository.update(document.id, { name: "Updated" });

      const result = await repository.getById(document.id);

      expect(result?.revision).toBe(2);
    });

    it("updates the updatedAt timestamp", async () => {
      const document = createDocument({
        updatedAt: "2020-01-01T00:00:00.000Z",
      });

      sessionDocumentState.documents.set(document.id, document);

      await repository.update(document.id, { name: "Updated" });

      const result = await repository.getById(document.id);

      expect(Date.parse(result!.updatedAt)).toBeGreaterThan(
        Date.parse(document.updatedAt),
      );
    });

    it("sets sync status to local", async () => {
      const document = createDocument({
        sync: { status: "synced" },
      });

      sessionDocumentState.documents.set(document.id, document);

      await repository.update(document.id, { name: "Updated" });

      const result = await repository.getById(document.id);

      expect(result?.sync.status).toBe("local");
    });

    it("removes collectionId when explicitly set to null", async () => {
      const document = createDocument({
        collectionId: "collection-1",
      });

      sessionDocumentState.documents.set(document.id, document);

      await repository.update(document.id, { collectionId: null });

      const result = await repository.getById(document.id);

      expect(result).not.toHaveProperty("collectionId");
    });

    it("rejects updates to missing documents", async () => {
      await expect(
        repository.update("missing", { name: "Updated" }),
      ).rejects.toThrow("Document not found.");
    });

    it("rejects updates to deleted documents", async () => {
      const document = createDocument({
        deletedAt: "2026-11-02T10:00:00.000Z",
      });

      sessionDocumentState.documents.set(document.id, document);

      await expect(
        repository.update(document.id, { name: "Updated" }),
      ).rejects.toThrow("Document not found.");
    });
  });

  describe("softDelete", () => {
    it("marks a document as deleted", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await repository.softDelete(document.id);

      const result = await repository.getById(document.id);

      expect(result?.deletedAt).toBeDefined();
    });

    it("increments the revision", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await repository.softDelete(document.id);

      const result = await repository.getById(document.id);

      expect(result?.revision).toBe(2);
    });

    it("does not increment revision when already deleted", async () => {
      const document = createDocument({
        deletedAt: "2026-11-02T10:00:00.000Z",
      });

      sessionDocumentState.documents.set(document.id, document);

      await repository.softDelete(document.id);

      const result = await repository.getById(document.id);

      expect(result?.revision).toBe(1);
    });

    it("rejects deletion of missing documents", async () => {
      await expect(repository.softDelete("missing")).rejects.toThrow(
        "Document not found.",
      );
    });
  });

  describe("restore", () => {
    it("restores a deleted document", async () => {
      const document = createDocument({
        deletedAt: "2026-11-02T10:00:00.000Z",
      });

      sessionDocumentState.documents.set(document.id, document);

      await repository.restore(document.id);

      const result = await repository.getById(document.id);

      expect(result).not.toHaveProperty("deletedAt");
    });

    it("increments revision when restoring", async () => {
      const document = createDocument({
        deletedAt: "2026-11-02T10:00:00.000Z",
      });

      sessionDocumentState.documents.set(document.id, document);

      await repository.restore(document.id);

      const result = await repository.getById(document.id);

      expect(result?.revision).toBe(2);
    });

    it("rejects restoring an active document", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await expect(repository.restore(document.id)).rejects.toThrow(
        "Deleted document not found.",
      );
    });

    it("rejects restoring a missing document", async () => {
      await expect(repository.restore("missing")).rejects.toThrow(
        "Deleted document not found.",
      );
    });
  });

  describe("permanentlyDelete", () => {
    it("deletes the document", async () => {
      const document = createDocument();
      sessionDocumentState.documents.set(document.id, document);

      await repository.permanentlyDelete(document.id);

      expect(sessionDocumentState.documents.has(document.id)).toBe(false);
    });

    it("deletes associated pages and assets", async () => {
      const document = createDocument();

      const page = createPage();
      const asset = createAsset();

      sessionDocumentState.documents.set(document.id, document);
      sessionDocumentState.pages.set(page.id, page);
      sessionDocumentState.assets.set(asset.id, asset);

      await repository.permanentlyDelete(document.id);

      expect(sessionDocumentState.pages.has(page.id)).toBe(false);
      expect(sessionDocumentState.assets.has(asset.id)).toBe(false);
    });

    it("preserves pages and assets belonging to other documents", async () => {
      const document = createDocument();

      const otherPage = createPage({
        id: "page-2",
        documentId: "document-2",
      });

      const otherAsset = createAsset({
        id: "asset-2",
        documentId: "document-2",
      });

      sessionDocumentState.documents.set(document.id, document);
      sessionDocumentState.pages.set(otherPage.id, otherPage);
      sessionDocumentState.assets.set(otherAsset.id, otherAsset);

      await repository.permanentlyDelete(document.id);

      expect(sessionDocumentState.pages.has(otherPage.id)).toBe(true);
      expect(sessionDocumentState.assets.has(otherAsset.id)).toBe(true);
    });

    it("rejects deletion of a missing document", async () => {
      await expect(repository.permanentlyDelete("missing")).rejects.toThrow(
        "Document not found.",
      );
    });
  });

  describe("getTrash", () => {
    it("returns only deleted documents", async () => {
      const active = createDocument();

      const deleted = createDocument({
        id: "document-2",
        deletedAt: "2026-11-02T10:00:00.000Z",
      });

      sessionDocumentState.documents.set(active.id, active);
      sessionDocumentState.documents.set(deleted.id, deleted);

      const result = await repository.getTrash();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(deleted.id);
    });
  });
});
