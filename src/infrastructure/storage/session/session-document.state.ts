import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

export class SessionDocumentState {
  readonly documents = new Map<string, Document>();
  readonly pages = new Map<string, DocumentPage>();
  readonly assets = new Map<string, StoredDocumentAsset>();
}

export const sessionDocumentState = new SessionDocumentState();
