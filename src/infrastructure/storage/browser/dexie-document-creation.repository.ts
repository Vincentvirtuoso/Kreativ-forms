import { database } from "./database";

import type {
  CreateDocumentRecord,
  DocumentCreationRepository,
} from "@/features/documents/repositories/document-creation.repository";

export class DexieDocumentCreationRepository implements DocumentCreationRepository {
  async createWithAssets(input: CreateDocumentRecord): Promise<void> {
    const { document, pages, assets } = input;

    await database.transaction(
      "rw",
      database.documents,
      database.pages,
      database.assets,
      async () => {
        await database.documents.add({
          ...document,
          persistence: "local",
        });

        if (pages.length > 0) {
          await database.pages.bulkAdd(pages);
        }

        if (assets.length > 0) {
          await database.assets.bulkAdd(
            assets.map((asset) => ({
              ...asset,
              documentId: document.id,
            })),
          );
        }
      },
    );
  }
}
