import type { DocumentPersistence } from "@/features/documents/domain/document.types";

import { LocalDocumentRepository } from "@/features/documents/infrastructure/database/repositories/local-document.repository";
import { LocalAssetRepository } from "@/features/documents/infrastructure/database/repositories/local-asset.repository";
import { LocalPageRepository } from "@/features/documents/infrastructure/database/repositories/local-page.repository";
import { LocalDocumentCreationRepository } from "@/features/documents/infrastructure/database/repositories/local-document-creation.repository";

import { SessionDocumentRepository } from "./session/session-document.repository";
import { SessionAssetRepository } from "./session/session-asset.repository";
import { SessionPageRepository } from "./session/session-page.repository";
import { SessionDocumentCreationRepository } from "./session/session-document-creation.repository";

export function getDocumentStorage(persistence: DocumentPersistence) {
  if (persistence === "session") {
    return {
      documents: new SessionDocumentRepository(),
      assets: new SessionAssetRepository(),
      pages: new SessionPageRepository(),
      creation: new SessionDocumentCreationRepository(),
    };
  }

  return {
    documents: new LocalDocumentRepository(),
    assets: new LocalAssetRepository(),
    pages: new LocalPageRepository(),
    creation: new LocalDocumentCreationRepository(),
  };
}
