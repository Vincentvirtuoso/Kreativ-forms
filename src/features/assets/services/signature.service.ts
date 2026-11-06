import type {
  SignatureAsset,
  SignatureId,
  CreateSignatureInput,
  UpdateSignatureInput,
} from "../domain/signature.types";

import type { SignatureRepository } from "../repositories/signature.repository";

import { validateSignatureInput } from "../domain/signature.rules";
import { dataUrlToBlob } from "../utils/signature-converter";
import { dexieDocumentStore } from "@/infrastructure/storage/browser/dexie-document.store";

export interface SignatureDrawingInput {
  png: string;
  svg?: string;
}

export class SignatureService {
  constructor(private readonly repository: SignatureRepository) {}

  async create(input: CreateSignatureInput): Promise<SignatureAsset> {
    validateSignatureInput(input);

    return this.repository.create({
      ...input,
      name: input.name.trim(),
    });
  }

  async createFromDataUrl(
    name: string,
    dataUrl: string,
  ): Promise<SignatureAsset> {
    return this.create({
      name,
      png: dataUrlToBlob(dataUrl),
    });
  }

  async createFromDrawing(
    name: string,
    drawing: SignatureDrawingInput,
  ): Promise<SignatureAsset> {
    return this.create({
      name,
      png: dataUrlToBlob(drawing.png),
      ...(drawing.svg ? { svg: drawing.svg } : {}),
    });
  }

  async getById(id: SignatureId): Promise<SignatureAsset | null> {
    return this.repository.getById(id);
  }

  async getAll(): Promise<SignatureAsset[]> {
    return this.repository.getAll();
  }

  async update(id: SignatureId, changes: UpdateSignatureInput): Promise<void> {
    return this.repository.update(id, changes);
  }

  async delete(id: SignatureId): Promise<void> {
    return this.repository.delete(id);
  }
}

export const signatureService = new SignatureService(
  dexieDocumentStore.signatures,
);
