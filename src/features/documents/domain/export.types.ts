import type { PageId } from "./document.types";

export interface ExportOptions {
  filename?: string;
  validateRequired?: boolean;
  pageIds?: PageId[];
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export interface ViewportGeometry {
  width: number;
  height: number;
  transform: number[];
  rotation: 0 | 90 | 180 | 270;
}

export interface PdfRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}