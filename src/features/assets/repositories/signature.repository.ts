import type {
  SignatureAsset,
  SignatureId,
  CreateSignatureInput,
  UpdateSignatureInput,
} from "../domain/signature.types";

export interface SignatureRepository {
  create(input: CreateSignatureInput): Promise<SignatureAsset>;

  getById(id: SignatureId): Promise<SignatureAsset | null>;

  getAll(): Promise<SignatureAsset[]>;

  update(id: SignatureId, changes: UpdateSignatureInput): Promise<void>;

  delete(id: SignatureId): Promise<void>;
}
