import { SessionAssetRepository } from "./session-asset.repository";
import { SessionDocumentCreationRepository } from "./session-document-creation.repository";
import { SessionDocumentRepository } from "./session-document.repository";
import { SessionPageRepository } from "./session-page.repository";

export class SessionDocumentStore {
  readonly documents = new SessionDocumentRepository();
  readonly assets = new SessionAssetRepository();
  readonly pages = new SessionPageRepository();
  readonly creation = new SessionDocumentCreationRepository();
}

export const sessionDocumentStore = new SessionDocumentStore();
