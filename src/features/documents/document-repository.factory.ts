import type { DocumentPersistence } from "./domain/document.types";

import type { DocumentRepository } from "./repositories/document.repository";
import type { AssetRepository } from "./repositories/asset.repository";
import type { PageRepository } from "./repositories/page.repository";
import type { DocumentCreationRepository } from "./repositories/document-creation.repository";
import type { AnnotationRepository } from "@/features/editor/repositories/annotation.repository";

import { sessionDocumentStore } from "@/infrastructure/storage/session/session-document.store";
import { dexieDocumentStore } from "@/infrastructure/storage/browser/dexie-document.store";

export interface DocumentRepositories {
  documents: DocumentRepository;
  assets: AssetRepository;
  pages: PageRepository;
  creation: DocumentCreationRepository;
  annotations: AnnotationRepository;
}

export function getDocumentRepositories(
  persistence: DocumentPersistence,
): DocumentRepositories {
  if (persistence === "session") {
    return {
      documents: sessionDocumentStore.documents,
      assets: sessionDocumentStore.assets,
      pages: sessionDocumentStore.pages,
      creation: sessionDocumentStore.creation,
      annotations: sessionDocumentStore.annotations,
    };
  }

  return {
    documents: dexieDocumentStore.documents,
    assets: dexieDocumentStore.assets,
    pages: dexieDocumentStore.pages,
    creation: dexieDocumentStore.creation,
    annotations: dexieDocumentStore.annotations,
  };
}
