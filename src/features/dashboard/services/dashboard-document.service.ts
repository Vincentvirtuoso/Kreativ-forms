import type { Document } from "@/features/documents/domain/document.types";
import type { DocumentRepository } from "@/features/documents/repositories/document.repository";

export interface DashboardDocument {
  id: string;
  name: string;
  status: Document["status"];
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export class DashboardDocumentService {
  constructor(
    private readonly localDocuments: DocumentRepository,
    private readonly sessionDocuments: DocumentRepository,
  ) {}

  private async findRepository(id: string) {
    const local = await this.localDocuments.getById(id);

    if (local) return { document: local, repository: this.localDocuments };

    const session = await this.sessionDocuments.getById(id);

    if (session)
      return { document: session, repository: this.sessionDocuments };

    throw new Error("Document not found.");
  }

  private toDashboardDocument(document: Document): DashboardDocument {
    return {
      id: document.id,
      name: document.name,
      status: document.status,
      pageCount: document.pageIds.length,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async getAll(): Promise<DashboardDocument[]> {
    const [local, session] = await Promise.all([
      this.localDocuments.getAll(),
      this.sessionDocuments.getAll(),
    ]);

    const documents = new Map<string, Document>();

    for (const document of [...local, ...session]) {
      if (!document.deletedAt) {
        documents.set(document.id, document);
      }
    }

    return [...documents.values()]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((document) => this.toDashboardDocument(document));
  }

  async getTrash(): Promise<DashboardDocument[]> {
    const [local, session] = await Promise.all([
      this.localDocuments.getTrash(),
      this.sessionDocuments.getTrash(),
    ]);

    const documents = new Map<string, Document>();

    for (const document of [...local, ...session]) {
      if (document.deletedAt) {
        documents.set(document.id, document);
      }
    }

    return [...documents.values()]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((document) => this.toDashboardDocument(document));
  }

  async moveToTrash(id: string): Promise<void> {
    const { document, repository } = await this.findRepository(id);

    if (document.deletedAt) {
      throw new Error("Document is already in trash.");
    }

    await repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    const { document, repository } = await this.findRepository(id);

    if (!document.deletedAt) {
      throw new Error("Document is not in trash.");
    }

    await repository.restore(id);
  }

  async permanentlyDelete(id: string): Promise<void> {
    const { document, repository } = await this.findRepository(id);

    if (!document.deletedAt) {
      throw new Error("Document must be in trash before permanent deletion.");
    }

    await repository.permanentlyDelete(id);
  }
}
