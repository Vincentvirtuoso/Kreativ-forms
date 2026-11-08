import { PDFDocument } from "pdf-lib";

import { DocumentImportError } from "../domain/import.errors";
import { throwIfImportAborted } from "../domain/import.rules";

import type {
  ImportPageMetadata,
  ValidatedImportFile,
} from "../domain/import.types";

export interface ImageConversionResult {
  blob: Blob;
  pageCount: number;
  pages: ImportPageMetadata[];
  fileName: string;
}

export class ImageConversionService {
  async convert(
    input: ValidatedImportFile,
    signal?: AbortSignal,
  ): Promise<ImageConversionResult> {
    return this.convertMany([input], signal);
  }

  async combine(
    inputs: ValidatedImportFile[],
    signal?: AbortSignal,
  ): Promise<ImageConversionResult> {
    return this.convertMany(inputs, signal);
  }

  private async convertMany(
    inputs: ValidatedImportFile[],
    signal?: AbortSignal,
  ): Promise<ImageConversionResult> {
    if (!inputs.length) {
      throw new DocumentImportError({
        code: "IMAGE_PROCESSING_FAILED",
        message: "No images were provided for conversion.",
      });
    }

    const pdf = await PDFDocument.create();
    const pages: ImportPageMetadata[] = [];

    try {
      for (const input of inputs) {
        throwIfImportAborted(signal);

        if (input.type !== "png" && input.type !== "jpg") {
          throw new DocumentImportError({
            code: "INVALID_FILE_TYPE",
            message: `"${input.file.name}" is not a supported image.`,
            fileName: input.file.name,
          });
        }

        const bytes = await input.file.arrayBuffer();

        throwIfImportAborted(signal);

        const image =
          input.type === "png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);

        const width = image.width;
        const height = image.height;

        if (!width || !height) {
          throw new Error("Invalid image dimensions.");
        }

        const page = pdf.addPage([width, height]);

        page.drawImage(image, {
          x: 0,
          y: 0,
          width,
          height,
        });

        pages.push({
  sourcePageNumber: pages.length + 1,
  width,
  height,
  rotation: 0,
  viewBox: [0, 0, width, height],
});
      }

      throwIfImportAborted(signal);

      const pdfBytes = await pdf.save();

      throwIfImportAborted(signal);

      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);

      return {
        blob: new Blob([pdfBuffer], {
          type: "application/pdf",
        }),
        pageCount: pages.length,
        pages,
        fileName: this.createOutputName(inputs),
      };
    } catch (error) {
      if (error instanceof DocumentImportError) {
        throw error;
      }

      if (signal?.aborted) {
        throw new DocumentImportError({
          code: "IMPORT_CANCELLED",
          message: "Image conversion was cancelled.",
          cause: error,
        });
      }

      throw new DocumentImportError({
        code: "IMAGE_PROCESSING_FAILED",
        message: "Unable to convert the selected image(s) into a PDF.",
        cause: error,
      });
    }
  }

  private createOutputName(inputs: ValidatedImportFile[]): string {
    if (inputs.length === 1) {
      return inputs[0].file.name.replace(/\.(png|jpe?g)$/i, ".pdf");
    }

    return "combined-images.pdf";
  }
}
