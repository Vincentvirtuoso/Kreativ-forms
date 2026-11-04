
import { dexieDocumentStore } from "@/infrastructure/storage/browser/dexie-document.store";
import { SignatureService } from "./signature.service";

export const signatureService = new SignatureService(
  dexieDocumentStore.signatures,
);
