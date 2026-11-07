import type { DocumentPersistence } from "../../domain/document.types";

export type ImportFileType = "pdf" | "png" | "jpg";

export type ImportStage =
  | "idle"
  | "validating"
  | "inspecting"
  | "converting"
  | "generating_thumbnails"
  | "preparing"
  | "saving"
  | "completed"
  | "failed"
  | "cancelled";

export type ImageImportMode = "separate" | "combine";

export interface ImportOptions {
  persistence: DocumentPersistence;
  imageMode?: ImageImportMode;
}

export interface ImportFile {
  id: string;
  file: File;
  type: ImportFileType;
}

export interface ImportFileMetadata {
  id: string;
  name: string;
  originalName: string;
  type: ImportFileType;
  mimeType: string;
  size: number;
  pageCount: number;
}

export interface ImportPageMetadata {
  sourcePageNumber: number;

  width: number;
  height: number;

  rotation: 0 | 90 | 180 | 270;

  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImportProgress {
  stage: ImportStage;
  percentage: number;
  currentFile?: string;
  currentFileIndex?: number;
  totalFiles?: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

export interface ImportErrorDetails {
  code: ImportErrorCode;
  message: string;
  fileName?: string;
  cause?: unknown;
}

export type ImportErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "INVALID_FILE"
  | "CORRUPTED_PDF"
  | "PASSWORD_PROTECTED_PDF"
  | "PDF_PROCESSING_FAILED"
  | "IMAGE_PROCESSING_FAILED"
  | "NO_FILES_SELECTED"
  | "INVALID_IMPORT_OPTIONS"
  | "IMPORT_CANCELLED"
  | "STORAGE_FAILED"
  | "UNKNOWN_ERROR";

export interface ImportResult {
  documentIds: string[];
  importedCount: number;
  failedCount: number;
}

export interface ImportCallbacks {
  onProgress?: (progress: ImportProgress) => void;
  signal?: AbortSignal;
}

export interface ImportRequest {
  files: File[];
  options: ImportOptions;
  callbacks?: ImportCallbacks;
}

export interface ValidatedImportFile {
  id: string;
  file: File;
  type: ImportFileType;
  mimeType: string;
  size: number;
}