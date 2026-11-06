import Dexie, { type Table } from "dexie";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "../../domain/document.types";

import type { Annotation } from "@/features/editor/domain/annotation.types";

import type { SignatureAsset } from "@/features/assets/domain/signature.types";
import type { HandwritingProfile } from "@/features/handwriting/domain/handwriting-profile.types";

export const DATABASE_NAME = "kreativ-forms";
export const DATABASE_VERSION = 3;

export interface SyncOutboxEntry {
  id: string;
  entityType: "document" | "page" | "asset";
  entityId: string;
  operation: "create" | "update" | "delete";
  revision: number;
  createdAt: string;
  payload?: unknown;
}

export interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface DeviceRecord {
  id: string;
  createdAt: string;
  lastActiveAt: string;
}

export class KreativFormsDatabase extends Dexie {
  documents!: Table<Document, string>;
  pages!: Table<DocumentPage, string>;
  assets!: Table<StoredDocumentAsset, string>;
  annotations!: Table<Annotation, string>;
  signatures!: Table<SignatureAsset, string>;
  handwritingProfiles!: Table<HandwritingProfile, string>;

  collections!: Table<CollectionRecord, string>;
  settings!: Table<SettingRecord, string>;
  devices!: Table<DeviceRecord, string>;
  outbox!: Table<SyncOutboxEntry, string>;

  constructor() {
    super(DATABASE_NAME);

    // Original schema. Keep this declaration unchanged.
    this.version(1).stores({
      documents: [
        "id",
        "status",
        "persistence",
        "updatedAt",
        "deletedAt",
        "collectionId",
        "sync.status",
        "[status+updatedAt]",
      ].join(", "),

      pages: ["id", "documentId", "[documentId+order]"].join(", "),

      assets: ["id", "documentId", "[documentId+type]"].join(", "),

      collections: "id, name, updatedAt",

      settings: "key",

      devices: "id, lastActiveAt",

      outbox: [
        "id",
        "entityType",
        "entityId",
        "createdAt",
        "[entityType+createdAt]",
      ].join(", "),
    });

    // Add annotations and reusable signatures.
    this.version(2).stores({
      documents: [
        "id",
        "status",
        "persistence",
        "updatedAt",
        "deletedAt",
        "collectionId",
        "sync.status",
        "[status+updatedAt]",
      ].join(", "),

      pages: ["id", "documentId", "[documentId+order]"].join(", "),

      assets: ["id", "documentId", "[documentId+type]"].join(", "),

      annotations: [
        "id",
        "documentId",
        "pageId",
        "[documentId+pageId]",
        "updatedAt",
      ].join(", "),

      signatures: "id, name, createdAt, updatedAt",

      collections: "id, name, updatedAt",

      settings: "key",

      devices: "id, lastActiveAt",

      outbox: [
        "id",
        "entityType",
        "entityId",
        "createdAt",
        "[entityType+createdAt]",
      ].join(", "),
    });

    this.version(DATABASE_VERSION).stores({
      documents: [
        "id",
        "status",
        "persistence",
        "updatedAt",
        "deletedAt",
        "collectionId",
        "sync.status",
        "[status+updatedAt]",
      ].join(", "),

      pages: ["id", "documentId", "[documentId+order]"].join(", "),

      assets: ["id", "documentId", "[documentId+type]"].join(", "),

      annotations: [
        "id",
        "documentId",
        "pageId",
        "[documentId+pageId]",
        "updatedAt",
      ].join(", "),

      signatures: "id, name, createdAt, updatedAt",

      handwritingProfiles: "id, name, status, createdAt, updatedAt",

      collections: "id, name, updatedAt",
      settings: "key",
      devices: "id, lastActiveAt",

      outbox: [
        "id",
        "entityType",
        "entityId",
        "createdAt",
        "[entityType+createdAt]",
      ].join(", "),
    });

    this.on("versionchange", () => {
      this.close();
    });

    this.on("blocked", () => {
      console.warn(
        "Kreativ Forms database upgrade is blocked by another open tab.",
      );
    });
  }
}

export const database = new KreativFormsDatabase();
