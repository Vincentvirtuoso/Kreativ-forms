import Dexie from "dexie";
import type { OutboxRepository } from "../../../repositories/outbox.repository";

import type { SyncOutboxEntry } from "../database";

import { database } from "../database";

export class LocalOutboxRepository implements OutboxRepository {
  async add(entry: SyncOutboxEntry): Promise<void> {
    await database.outbox.add(entry);
  }

  async getById(id: string): Promise<SyncOutboxEntry | null> {
    return (await database.outbox.get(id)) ?? null;
  }

  async getAll(): Promise<SyncOutboxEntry[]> {
    return database.outbox.orderBy("createdAt").toArray();
  }

  async getPending(limit = 100): Promise<SyncOutboxEntry[]> {
    return database.outbox.orderBy("createdAt").limit(limit).toArray();
  }

  async delete(id: string): Promise<void> {
    await database.outbox.delete(id);
  }

  async deleteByEntity(
    entityType: SyncOutboxEntry["entityType"],
    entityId: string,
  ): Promise<void> {
    await database.outbox
      .where("[entityType+createdAt]")
      .between([entityType, Dexie.minKey], [entityType, Dexie.maxKey])
      .filter((entry) => entry.entityId === entityId)
      .delete();
  }

  async count(): Promise<number> {
    return database.outbox.count();
  }
}
