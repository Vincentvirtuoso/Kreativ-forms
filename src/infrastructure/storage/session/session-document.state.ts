import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";
import { Annotation } from "@/features/editor/domain/annotation.types";

export class SessionDocumentState {
  readonly documents = new Map<string, Document>();
  readonly pages = new Map<string, DocumentPage>();
  readonly assets = new Map<string, StoredDocumentAsset>();
  readonly annotations = new Map<string, Annotation>();
}

export const sessionDocumentState = new SessionDocumentState();
