import type { SyncOutboxEntry } from "../infrastructure/database/database";

export interface OutboxRepository {
  add(entry: SyncOutboxEntry): Promise<void>;

  getById(id: string): Promise<SyncOutboxEntry | null>;

  getAll(): Promise<SyncOutboxEntry[]>;

  getPending(limit?: number): Promise<SyncOutboxEntry[]>;

  delete(id: string): Promise<void>;

  deleteByEntity(
    entityType: SyncOutboxEntry["entityType"],
    entityId: string,
  ): Promise<void>;

  count(): Promise<number>;
}
