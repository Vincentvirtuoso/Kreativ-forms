import { dexieDocumentStore } from "@/infrastructure/storage/browser/dexie-document.store";
import type { DocumentPersistence } from "../domain/document.types";
import type { DocumentCreationRepository } from "../repositories/document-creation.repository";

import { sessionDocumentStore } from "@/infrastructure/storage/session/session-document.store";

export function getDocumentCreationRepository(
  persistence: DocumentPersistence,
): DocumentCreationRepository {
  return persistence === "session"
    ? sessionDocumentStore.creation
    : dexieDocumentStore.creation;
}
