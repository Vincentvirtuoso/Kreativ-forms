import { DexieDocumentRepository } from "./dexie-document.repository";
import { DexiePageRepository } from "./dexie-page.repository";
import { DexieAssetRepository } from "./dexie-asset.repository";
import { DexieDocumentCreationRepository } from "./dexie-document-creation.repository";
import { DexieAnnotationRepository } from "./dexie-annotation.repository";

export class DexieDocumentStore {
  readonly documents = new DexieDocumentRepository();
  readonly pages = new DexiePageRepository();
  readonly assets = new DexieAssetRepository();
  readonly creation = new DexieDocumentCreationRepository();
  readonly annotations = new DexieAnnotationRepository();
}

export const dexieDocumentStore = new DexieDocumentStore();
