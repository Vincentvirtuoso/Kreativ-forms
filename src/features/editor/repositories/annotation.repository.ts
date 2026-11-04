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

export interface AnnotationRepository {
  create(input: Annotation): Promise<void>;
  getById(id: AnnotationId): Promise<Annotation | null>;
  getByDocumentId(documentId: DocumentId): Promise<Annotation[]>;
  getByPageId(pageId: PageId): Promise<Annotation[]>;
  update(id: AnnotationId, updateData: AnnotationUpdate): Promise<void>;
  replace(annotation: ReplaceAnnotationInput): Promise<void>;
  delete(id: AnnotationId): Promise<void>;
  deleteByDocumentId(documentId: DocumentId): Promise<void>;
}