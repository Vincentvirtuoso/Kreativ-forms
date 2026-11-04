import type {
  Document,
  DocumentId,
  UpdateDocumentInput,
} from "../../../domain/document.types";

import { documentSchema } from "../../../domain/document.schema";
import type { DocumentRepository } from "../../../repositories/document.repository";

import { database, type SyncOutboxEntry } from "../database";

function createOutboxEntry(
  document: Document,
  operation: SyncOutboxEntry["operation"],
): SyncOutboxEntry {
  return {
    id: crypto.randomUUID(),
    entityType: "document",
    entityId: document.id,
    operation,
    revision: document.revision,
    createdAt: new Date().toISOString(),
    payload: document,
  };
}

function validate(document: Document): Document {
  return documentSchema.parse(document);
}

export class LocalDocumentRepository implements DocumentRepository {
  async getById(id: DocumentId): Promise<Document | null> {
    return (await database.documents.get(id)) ?? null;
  }

  async getAll(): Promise<Document[]> {
    return database.documents
      .filter((document) => !document.deletedAt)
      .toArray();
  }

  async update(id: DocumentId, changes: UpdateDocumentInput): Promise<void> {
    await database.transaction(
      "rw",
      database.documents,
      database.outbox,
      async () => {
        const current = await database.documents.get(id);

        if (!current || current.deletedAt) {
          throw new Error("Document not found.");
        }

        const { collectionId, completedAt, ...otherChanges } = changes;

        const next: Document = {
          ...current,
          ...otherChanges,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString(),
          sync: {
            ...current.sync,
            status: "pending",
          },
        };

        if (collectionId === null) {
          delete next.collectionId;
        } else if (collectionId !== undefined) {
          next.collectionId = collectionId;
        }

        if (completedAt === null) {
          delete next.completedAt;
        } else if (completedAt !== undefined) {
          next.completedAt = completedAt;
        }

        const validated = validate(next);

        await database.documents.put(validated);

        await database.outbox.add(createOutboxEntry(validated, "update"));
      },
    );
  }

  async softDelete(id: DocumentId): Promise<void> {
    await database.transaction(
      "rw",
      database.documents,
      database.outbox,
      async () => {
        const current = await database.documents.get(id);

        if (!current) {
          throw new Error("Document not found.");
        }

        if (current.deletedAt) return;

        const next = validate({
          ...current,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revision: current.revision + 1,
          sync: {
            ...current.sync,
            status: "pending",
          },
        });

        await database.documents.put(next);

        await database.outbox.add(createOutboxEntry(next, "delete"));
      },
    );
  }

  async restore(id: DocumentId): Promise<void> {
    await database.transaction(
      "rw",
      database.documents,
      database.outbox,
      async () => {
        const current = await database.documents.get(id);

        if (!current?.deletedAt) {
          throw new Error("Deleted document not found.");
        }

        const { deletedAt: _deletedAt, ...restoredDocument } = current;

        const next = validate({
          ...restoredDocument,
          updatedAt: new Date().toISOString(),
          revision: current.revision + 1,
          sync: {
            ...current.sync,
            status: "pending",
          },
        });

        await database.documents.put(next);

        await database.outbox.add(createOutboxEntry(next, "update"));
      },
    );
  }

  async permanentlyDelete(id: DocumentId): Promise<void> {
    await database.transaction(
      "rw",
      database.documents,
      database.pages,
      database.assets,
      database.annotations,
      database.outbox,
      async () => {
        const current = await database.documents.get(id);

        if (!current) {
          throw new Error("Document not found.");
        }

        if (!current.deletedAt) {
          throw new Error(
            "Document must be in trash before permanent deletion.",
          );
        }

        const revision = current.revision + 1;
        const now = new Date().toISOString();

        await database.outbox.where("entityId").equals(id).delete();

        await database.annotations.where("documentId").equals(id).delete();

        await database.pages.where("documentId").equals(id).delete();

        await database.assets.where("documentId").equals(id).delete();

        await database.documents.delete(id);

        await database.outbox.add({
          id: crypto.randomUUID(),
          entityType: "document",
          entityId: id,
          operation: "delete",
          revision,
          createdAt: now,
          payload: {
            id,
            revision,
            serverRevision: current.sync.serverRevision,
          },
        });
      },
    );
  }
  
  async getTrash(): Promise<Document[]> {
    return database.documents
      .filter((document) => Boolean(document.deletedAt))
      .toArray();
  }
}
