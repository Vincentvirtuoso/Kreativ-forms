import type {
  AnnotationId,
  AnnotationUpdate,
} from "../domain/annotation.types";
import { AnnotationService } from "./annotation.service";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

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
    private readonly onStatusChange?: (status: SaveStatus) => void,
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
        // Failed updates remain pending for retry.
      });
    }, this.delay);

    this.pending.set(id, { update: merged, timer });
    this.onStatusChange?.("saving");
  }

  async flush(id: AnnotationId): Promise<void> {
    while (true) {
      const pending = this.pending.get(id);

      if (pending?.timer) {
        clearTimeout(pending.timer);
        pending.timer = null;
      }

      const active = this.inFlight.get(id);

      if (active) {
        await active;
        continue;
      }

      if (!this.pending.has(id)) {
        return;
      }

      const operation = this.drain(id);
      this.inFlight.set(id, operation);

      try {
        await operation;
      } finally {
        if (this.inFlight.get(id) === operation) {
          this.inFlight.delete(id);
        }

        if (this.pending.size === 0 && this.inFlight.size === 0) {
          this.onStatusChange?.("saved");
        }
      }
    }
  }

  private async drain(id: AnnotationId): Promise<void> {
    while (true) {
      const pending = this.pending.get(id);

      if (!pending) {
        if (this.pending.size === 0 && this.inFlight.size <= 1) {
          this.onStatusChange?.("saved");
        }

        return;
      }

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

        this.onStatusChange?.("error");
        this.onError?.(error, id);

        throw error;
      }
    }
  }

  async flushAll(): Promise<void> {
    while (this.pending.size > 0 || this.inFlight.size > 0) {
      const ids = new Set([...this.pending.keys(), ...this.inFlight.keys()]);

      const results = await Promise.allSettled(
        [...ids].map((id) => this.flush(id)),
      );

      const failures = results.filter((result) => result.status === "rejected");

      if (failures.length > 0) {
        this.onStatusChange?.("error");

        throw new Error(
          `${failures.length} annotation update(s) failed to save.`,
        );
      }
    }

    this.onStatusChange?.("saved");
  }

  hasPending(id?: AnnotationId): boolean {
    if (id) {
      return this.pending.has(id) || this.inFlight.has(id);
    }

    return this.pending.size > 0 || this.inFlight.size > 0;
  }

  cancel(id: AnnotationId): void {
    const pending = this.pending.get(id);

    if (pending?.timer) {
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
