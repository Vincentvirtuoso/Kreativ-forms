export type AssetType = "original_pdf" | "working_pdf" | "thumbnail" | "image";

export interface DocumentAsset {
  id: string;
  documentId: string;

  type: AssetType;
  mimeType: string;
  size: number;

  createdAt: string;
  checksum?: string;
}
