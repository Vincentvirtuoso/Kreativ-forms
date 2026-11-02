import { DocumentImportError } from "../domain/import.errors";

import { IMPORT_RULES, throwIfImportAborted } from "../domain/import.rules";

import type {
  ImportFileType,
  ValidatedImportFile,
} from "../domain/import.types";

const FILE_SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpg: [0xff, 0xd8, 0xff],
} as const;

const SUPPORTED_MIME_TYPES: Record<ImportFileType, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

export class FileValidationService {
  async validate(
    file: File,
    signal?: AbortSignal,
  ): Promise<ValidatedImportFile> {
    throwIfImportAborted(signal);

    this.validateSize(file);

    const type = await this.detectFileType(file, signal);

    this.validateMimeType(file, type);

    throwIfImportAborted(signal);

    return {
      id: crypto.randomUUID(),
      file,
      type,
      mimeType: SUPPORTED_MIME_TYPES[type],
      size: file.size,
    };
  }

  async validateMany(
    files: File[],
    signal?: AbortSignal,
  ): Promise<ValidatedImportFile[]> {
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

    const uniqueFiles = new Set(files);

    if (uniqueFiles.size !== files.length) {
      throw new DocumentImportError({
        code: "INVALID_IMPORT_OPTIONS",
        message: "The same file was selected more than once.",
      });
    }

    const validated: ValidatedImportFile[] = [];

    for (const file of files) {
      throwIfImportAborted(signal);
      validated.push(await this.validate(file, signal));
    }

    return validated;
  }

  private validateSize(file: File): void {
    if (file.size === 0) {
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
  }

  private async detectFileType(
    file: File,
    signal?: AbortSignal,
  ): Promise<ImportFileType> {
    try {
      const buffer = await file.slice(0, 1024).arrayBuffer();

      throwIfImportAborted(signal);

      const bytes = new Uint8Array(buffer);

      if (this.matchesSignature(bytes, FILE_SIGNATURES.png)) {
        return "png";
      }

      if (this.matchesSignature(bytes, FILE_SIGNATURES.jpg)) {
        return "jpg";
      }

      // PDF headers are expected near the beginning of the file.
      const header = new TextDecoder().decode(bytes);

      if (header.includes("%PDF-")) {
        return "pdf";
      }

      throw new DocumentImportError({
        code: "INVALID_FILE",
        message: `"${file.name}" does not contain a valid supported file signature.`,
        fileName: file.name,
      });
    } catch (error) {
      if (error instanceof DocumentImportError) {
        throw error;
      }

      throw new DocumentImportError({
        code: "INVALID_FILE",
        message: `Unable to inspect "${file.name}".`,
        fileName: file.name,
        cause: error,
      });
    }
  }

  private matchesSignature(
    bytes: Uint8Array,
    signature: readonly number[],
  ): boolean {
    return signature.every((byte, index) => bytes[index] === byte);
  }

  private validateMimeType(file: File, detectedType: ImportFileType): void {
    const declaredMime = file.type.toLowerCase();

    // Empty MIME types and generic binary MIME types are allowed.
    if (!declaredMime || declaredMime === "application/octet-stream") {
      return;
    }

    const detectedMime = SUPPORTED_MIME_TYPES[detectedType];

    const isSupportedMime =
      Object.values(SUPPORTED_MIME_TYPES).includes(declaredMime);

    if (isSupportedMime && declaredMime !== detectedMime) {
      throw new DocumentImportError({
        code: "INVALID_FILE_TYPE",
        message: `"${file.name}" has a MIME type that does not match its actual contents.`,
        fileName: file.name,
      });
    }
  }
}
