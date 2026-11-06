import { database } from "@/features/documents/infrastructure/database/database";
import { DexieHandwritingProfileRepository } from "@/infrastructure/storage/browser/dexie-handwriting-profile.repository";

export function getHandwritingProfileRepository() {
  return new DexieHandwritingProfileRepository(database.handwritingProfiles);
}
