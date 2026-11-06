import { DexieDocumentRepository } from "./dexie-document.repository";
import { DexiePageRepository } from "./dexie-page.repository";
import { DexieAssetRepository } from "./dexie-asset.repository";
import { DexieDocumentCreationRepository } from "./dexie-document-creation.repository";
import { DexieAnnotationRepository } from "./dexie-annotation.repository";
import { DexieSignatureRepository } from "./dexie-signature.repository";
import { DexieHandwritingProfileRepository } from "./dexie-handwriting-profile.repository";
import { database } from "@/features/documents/infrastructure/database/database";

export class DexieDocumentStore {
  readonly documents = new DexieDocumentRepository();
  readonly pages = new DexiePageRepository();
  readonly assets = new DexieAssetRepository();
  readonly creation = new DexieDocumentCreationRepository();
  readonly annotations = new DexieAnnotationRepository();
  readonly signatures = new DexieSignatureRepository();
  readonly handwritingProfiles = new DexieHandwritingProfileRepository(database.handwritingProfiles);
}

export const dexieDocumentStore = new DexieDocumentStore();
