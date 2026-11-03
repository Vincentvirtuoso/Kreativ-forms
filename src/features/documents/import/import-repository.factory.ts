import type { DocumentPersistence } from "../domain/document.types";
import type { DocumentCreationRepository } from "../repositories/document-creation.repository";

import { sessionDocumentStore } from "@/infrastructure/storage/session/session-document.store";

export function getDocumentCreationRepository(
  persistence: DocumentPersistence,
): DocumentCreationRepository {
  if (persistence === "session") {
    return sessionDocumentStore.creation;
  }

  throw new Error("Local document storage is not implemented yet.");
}
