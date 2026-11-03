import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "../domain/document.types";

export interface DocumentWorkspace {
  document: Document;
  pages: DocumentPage[];
  assets: StoredDocumentAsset[];
  originalPdf: StoredDocumentAsset;
  workingPdf: StoredDocumentAsset;
}
