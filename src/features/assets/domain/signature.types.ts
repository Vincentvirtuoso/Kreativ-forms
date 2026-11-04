export type SignatureId = string;

export type SignatureFormat = "svg" | "png" | "both";

export interface SignatureAsset {
  id: SignatureId;
  type: "signature";
  name: string;
  format: SignatureFormat;
  svg?: string;
  png?: Blob;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSignatureInput {
  name: string;
  svg?: string;
  png?: Blob;
}

export interface UpdateSignatureInput {
  name?: string;
  svg?: string | null;
  png?: Blob | null;
}
