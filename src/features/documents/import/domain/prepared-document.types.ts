import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "../../domain/document.types";

export interface PreparedDocumentDraft {
  document: Document;
  pages: DocumentPage[];
  assets: StoredDocumentAsset[];
}

export interface PreparedImport {
  documents: PreparedDocumentDraft[];
}
