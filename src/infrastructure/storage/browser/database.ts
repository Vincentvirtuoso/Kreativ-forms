import Dexie, { type Table } from "dexie";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import type { Annotation } from "@/features/editor/domain/annotation.types";

export class KreativFormsDatabase extends Dexie {
  documents!: Table<Document, string>;
  pages!: Table<DocumentPage, string>;
  assets!: Table<StoredDocumentAsset, string>;
  annotations!: Table<Annotation, string>;

  constructor() {
    super("kreativ-forms");

    this.version(1).stores({
      documents: "&id, status, persistence, updatedAt, deletedAt",

      pages: "&id, documentId, [documentId+order]",

      assets: "&id, documentId, type, [documentId+type]",

      annotations: "&id, documentId, pageId, [documentId+pageId], updatedAt",
    });
  }
}

export const database = new KreativFormsDatabase();
