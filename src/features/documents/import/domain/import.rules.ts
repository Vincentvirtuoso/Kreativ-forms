import { DocumentImportError } from "./import.errors";

import type { ImportFileType, ImportOptions } from "./import.types";

export const IMPORT_RULES = {
  maxFileSize: 25 * 1024 * 1024,
  maxFiles: 50,
  allowedMimeTypes: {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
  },
} as const;

export function getImportFileType(file: File): ImportFileType {
  const mimeType = file.type.toLowerCase();

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";

  throw new DocumentImportError({
    code: "INVALID_FILE_TYPE",
    message: `"${file.name}" is not a supported file type.`,
    fileName: file.name,
  });
}

export function validateImportFile(file: File): void {
  if (!file.size) {
    throw new DocumentImportError({
      code: "EMPTY_FILE",
      message: `"${file.name}" is empty.`,
      fileName: file.name,
    });
  }

  if (file.size > IMPORT_RULES.maxFileSize) {
    throw new DocumentImportError({
      code: "FILE_TOO_LARGE",
      message: `"${file.name}" exceeds the 25 MB file limit.`,
      fileName: file.name,
    });
  }

  getImportFileType(file);
}

export function validateImportFiles(files: File[]): void {
  if (!files.length) {
    throw new DocumentImportError({
      code: "NO_FILES_SELECTED",
      message: "Select at least one file to import.",
    });
  }

  if (files.length > IMPORT_RULES.maxFiles) {
    throw new DocumentImportError({
      code: "INVALID_IMPORT_OPTIONS",
      message: `You can import up to ${IMPORT_RULES.maxFiles} files at once.`,
    });
  }

  const fileIds = new Set(files);

  if (fileIds.size !== files.length) {
    throw new DocumentImportError({
      code: "INVALID_IMPORT_OPTIONS",
      message: "The same file was selected more than once.",
    });
  }

  files.forEach(validateImportFile);
}

export function validateImportOptions(
  files: File[],
  options: ImportOptions,
): void {
  if (!["local", "session"].includes(options.persistence)) {
    throw new DocumentImportError({
      code: "INVALID_IMPORT_OPTIONS",
      message: "Invalid document storage option.",
    });
  }

  const hasImages = files.some((file) => {
    const type = getImportFileType(file);
    return type === "png" || type === "jpg";
  });

  const hasPDFs = files.some((file) => file.type === "application/pdf");

  if (
    hasImages &&
    options.imageMode !== "separate" &&
    options.imageMode !== "combine"
  ) {
    throw new DocumentImportError({
      code: "INVALID_IMPORT_OPTIONS",
      message:
        "Choose whether images should be imported separately or combined.",
    });
  }

  if (hasImages && hasPDFs && options.imageMode === "combine") {
    throw new DocumentImportError({
      code: "INVALID_IMPORT_OPTIONS",
      message: "Image combination only applies to the selected images.",
    });
  }
}

export function getImportPercentage(completed: number, total: number): number {
  if (total <= 0) return 0;

  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

export function throwIfImportAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DocumentImportError({
      code: "IMPORT_CANCELLED",
      message: "Document import was cancelled.",
      cause: signal.reason,
    });
  }
}
