import type {
  Annotation,
  AnnotationId,
  AnnotationUpdate,
  ReplaceAnnotationInput,
} from "../domain/annotation.types";

import type {
  DocumentId,
  PageId,
} from "@/features/documents/domain/document.types";

import type { AnnotationRepository } from "../repositories/annotation.repository";
import type { DocumentRepository } from "@/features/documents/repositories/document.repository";

export class AnnotationService {
  constructor(
    private readonly repository: AnnotationRepository,
    private readonly documents: DocumentRepository,
  ) {}

  private async markAsInProgress(documentId: DocumentId): Promise<void> {
    const document = await this.documents.getById(documentId);

    if (!document || document.status !== "completed") return;

    await this.documents.update(documentId, {
      status: "in_progress",
      completedAt: undefined,
    });
  }

  async loadByDocument(documentId: DocumentId): Promise<Annotation[]> {
    return this.repository.getByDocumentId(documentId);
  }

  async loadByPage(pageId: PageId): Promise<Annotation[]> {
    return this.repository.getByPageId(pageId);
  }

  async create(annotation: Annotation): Promise<void> {
    await this.repository.create(annotation);
    await this.markAsInProgress(annotation.documentId);
  }

  async update(id: AnnotationId, update: AnnotationUpdate): Promise<void> {
    const annotation = await this.repository.getById(id);

    await this.repository.update(id, update);

    if (annotation) {
      await this.markAsInProgress(annotation.documentId);
    }
  }

  async delete(id: AnnotationId): Promise<void> {
    const annotation = await this.repository.getById(id);

    await this.repository.delete(id);

    if (annotation) {
      await this.markAsInProgress(annotation.documentId);
    }
  }

  async deleteByDocument(documentId: DocumentId): Promise<void> {
    await this.repository.deleteByDocumentId(documentId);
    await this.markAsInProgress(documentId);
  }

  async replace(annotation: ReplaceAnnotationInput): Promise<void> {
    await this.repository.replace(annotation);
    await this.markAsInProgress(annotation.documentId);
  }
}
