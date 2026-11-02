import type { ImportErrorCode, ImportErrorDetails } from "./import.types";

export class DocumentImportError extends Error {
  readonly code: ImportErrorCode;
  readonly fileName?: string;
  readonly cause?: unknown;

  constructor(details: ImportErrorDetails) {
    super(details.message);

    this.name = "DocumentImportError";
    this.code = details.code;
    this.fileName = details.fileName;
    this.cause = details.cause;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      fileName: this.fileName,
    };
  }
}

export function isDocumentImportError(
  error: unknown,
): error is DocumentImportError {
  return error instanceof DocumentImportError;
}

export function createImportError(
  code: ImportErrorCode,
  message: string,
  fileName?: string,
  cause?: unknown,
): DocumentImportError {
  return new DocumentImportError({
    code,
    message,
    fileName,
    cause,
  });
}
