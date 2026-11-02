import type {
  CreateDocumentRecord,
  DocumentCreationRepository,
} from "../repositories/document-creation.repository";

export class DocumentCreationService {
  constructor(private readonly repository: DocumentCreationRepository) {}

  async create(input: CreateDocumentRecord): Promise<void> {
    await this.repository.createWithAssets(input);
  }
}
