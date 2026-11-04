
import type {
  SignatureAsset,
  SignatureId,
  CreateSignatureInput,
  UpdateSignatureInput,
} from "@/features/assets/domain/signature.types";

import type { SignatureRepository } from "@/features/assets/repositories/signature.repository";

import {
  getSignatureFormat,
  validateSignatureInput,
} from "@/features/assets/domain/signature.rules";
import { database } from "@/features/documents/infrastructure/database/database";

export class DexieSignatureRepository implements SignatureRepository {
  async create(input: CreateSignatureInput): Promise<SignatureAsset> {
    validateSignatureInput(input);

    const now = new Date().toISOString();

    const signature: SignatureAsset = {
      id: crypto.randomUUID(),
      type: "signature",
      name: input.name.trim(),
      format: getSignatureFormat(input),
      svg: input.svg,
      png: input.png,
      createdAt: now,
      updatedAt: now,
    };

    await database.signatures.add(signature);

    return signature;
  }

  async getById(id: SignatureId): Promise<SignatureAsset | null> {
    return (await database.signatures.get(id)) ?? null;
  }

  async getAll(): Promise<SignatureAsset[]> {
    return database.signatures.orderBy("updatedAt").reverse().toArray();
  }

  async update(id: SignatureId, changes: UpdateSignatureInput): Promise<void> {
    await database.transaction("rw", database.signatures, async () => {
      const existing = await database.signatures.get(id);

      if (!existing) {
        throw new Error("Signature not found.");
      }

      const svg =
        changes.svg === null ? undefined : (changes.svg ?? existing.svg);

      const png =
        changes.png === null ? undefined : (changes.png ?? existing.png);

      const name = changes.name?.trim() ?? existing.name;

      if (!name) {
        throw new Error("A signature name is required.");
      }

      const format = getSignatureFormat({ svg, png });

      if (png && (png.type !== "image/png" || png.size === 0)) {
        throw new Error("A valid, non-empty PNG image is required.");
      }

      const updated: SignatureAsset = {
        ...existing,
        name,
        svg,
        png,
        format,
        updatedAt: new Date().toISOString(),
      };

      await database.signatures.put(updated);
    });
  }

  async delete(id: SignatureId): Promise<void> {
    await database.transaction("rw", database.signatures, async () => {
      const existing = await database.signatures.get(id);

      if (!existing) {
        throw new Error("Signature not found.");
      }

      await database.signatures.delete(id);
    });
  }
}
