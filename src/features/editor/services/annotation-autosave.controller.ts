import type {
  AnnotationId,
  AnnotationUpdate,
} from "../domain/annotation.types";

import type { AnnotationRepository } from "../repositories/annotation.repository";
import { AnnotationService } from "./annotation.service";

type PendingUpdate = {
  update: AnnotationUpdate;
  timer: ReturnType<typeof setTimeout> | null;
};

export class AnnotationAutosaveController {
  private readonly pending = new Map<AnnotationId, PendingUpdate>();
  private readonly inFlight = new Map<AnnotationId, Promise<void>>();

  constructor(
    private readonly service: AnnotationService,
    private readonly delay = 500,
    private readonly onError?: (error: unknown, id: AnnotationId) => void,
  ) {}

  schedule(id: AnnotationId, update: AnnotationUpdate): void {
    const previous = this.pending.get(id);

    if (previous && previous.update.type !== update.type) {
      throw new Error("Annotation type mismatch.");
    }

    if (previous?.timer) {
      clearTimeout(previous.timer);
    }

    const merged = previous ? this.merge(previous.update, update) : update;

    const timer = setTimeout(() => {
      void this.flush(id).catch(() => {
        // The failed update remains pending for a later retry.
      });
    }, this.delay);

    this.pending.set(id, { update: merged, timer });
  }

  async flush(id: AnnotationId): Promise<void> {
    const active = this.inFlight.get(id);

    if (active) {
      await active;

      // Updates may have arrived while the previous save was running.
      if (this.pending.has(id)) {
        await this.flush(id);
      }

      return;
    }

    const operation = this.flushPending(id);
    this.inFlight.set(id, operation);

    try {
      await operation;
    } finally {
      if (this.inFlight.get(id) === operation) {
        this.inFlight.delete(id);
      }
    }
  }

  private async flushPending(id: AnnotationId): Promise<void> {
    while (true) {
      const pending = this.pending.get(id);

      if (!pending) return;

      if (pending.timer) {
        clearTimeout(pending.timer);
      }

      this.pending.delete(id);

      try {
        await this.service.update(id, pending.update);
      } catch (error) {
        const newer = this.pending.get(id);

        if (newer?.timer) {
          clearTimeout(newer.timer);
        }

        const restored = newer
          ? this.merge(pending.update, newer.update)
          : pending.update;

        this.pending.set(id, {
          update: restored,
          timer: null,
        });

        this.onError?.(error, id);
        throw error;
      }
    }
  }

  async flushAll(): Promise<void> {
    const ids = [...new Set([...this.pending.keys(), ...this.inFlight.keys()])];

    const results = await Promise.allSettled(ids.map((id) => this.flush(id)));

    const failed = results.filter((result) => result.status === "rejected");

    if (failed.length) {
      throw new Error(`${failed.length} annotation update(s) failed to save.`);
    }
  }

  cancel(id: AnnotationId): void {
    const pending = this.pending.get(id);

    if (!pending) return;

    if (pending.timer) {
      clearTimeout(pending.timer);
    }

    this.pending.delete(id);
  }

  cancelAll(): void {
    for (const pending of this.pending.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
    }

    this.pending.clear();
  }

  private merge(
    previous: AnnotationUpdate,
    next: AnnotationUpdate,
  ): AnnotationUpdate {
    if (previous.type !== next.type) {
      throw new Error("Annotation type mismatch.");
    }

    return {
      ...next,
      changes: {
        ...previous.changes,
        ...next.changes,
        position: next.changes.position
          ? {
              ...previous.changes.position,
              ...next.changes.position,
            }
          : previous.changes.position,
        style: next.changes.style
          ? {
              ...previous.changes.style,
              ...next.changes.style,
            }
          : previous.changes.style,
      },
    } as AnnotationUpdate;
  }
}
