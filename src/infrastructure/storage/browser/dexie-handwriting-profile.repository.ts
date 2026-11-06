import type { Table } from "dexie";

import type {
  HandwritingProfile,
  HandwritingProfileId,
} from "@/features/handwriting/domain/handwriting-profile.types";

import type { HandwritingProfileRepository } from "@/features/handwriting/repositories/handwriting-profile.repository";

export class DexieHandwritingProfileRepository implements HandwritingProfileRepository {
  constructor(private readonly table: Table<HandwritingProfile, string>) {}

  async create(profile: HandwritingProfile): Promise<void> {
    await this.table.add(profile);
  }

  async getById(
    id: HandwritingProfileId,
  ): Promise<HandwritingProfile | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<HandwritingProfile[]> {
    return this.table.orderBy("updatedAt").reverse().toArray();
  }

  async update(
    id: HandwritingProfileId,
    changes: Partial<HandwritingProfile>,
  ): Promise<void> {
    const updatedCount = await this.table
      .where("id")
      .equals(id)
      .modify((current) => {
        Object.assign(current, changes, {
          id,
          updatedAt: Date.now(),
        });

        if ("fontBlob" in changes && changes.fontBlob === undefined) {
          delete current.fontBlob;
        }
      });

    if (!updatedCount) {
      throw new Error("Handwriting profile not found.");
    }
  }
  
  async delete(id: HandwritingProfileId): Promise<void> {
    await this.table.delete(id);
  }
}
