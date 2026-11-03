import type {
  Annotation,
  AnnotationId,
  AnnotationUpdate,
} from "../domain/annotation.types";

import type {
  DocumentId,
  PageId,
} from "@/features/documents/domain/document.types";

import type { AnnotationRepository } from "../repositories/annotation.repository";

export class AnnotationService {
  constructor(private readonly repository: AnnotationRepository) {}

  async loadByDocument(documentId: DocumentId): Promise<Annotation[]> {
    return this.repository.getByDocumentId(documentId);
  }

  async loadByPage(pageId: PageId): Promise<Annotation[]> {
    return this.repository.getByPageId(pageId);
  }

  async create(annotation: Annotation): Promise<void> {
    await this.repository.create(annotation);
  }

  async update(id: AnnotationId, update: AnnotationUpdate): Promise<void> {
    await this.repository.update(id, update);
  }

  async delete(id: AnnotationId): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByDocument(documentId: DocumentId): Promise<void> {
    await this.repository.deleteByDocumentId(documentId);
  }
}
