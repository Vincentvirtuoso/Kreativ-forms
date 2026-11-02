import * as pdfjsLib from "pdfjs-dist";

import { DocumentImportError } from "../domain/import.errors";
import { throwIfImportAborted } from "../domain/import.rules";

import type { ImportPageMetadata } from "../domain/import.types";
import { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

export interface GeneratedThumbnail {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

export class ThumbnailService {
  private readonly thumbnailWidth = 320;
  private readonly thumbnailType = "image/webp";
  private readonly thumbnailQuality = 0.8;

  async generate(
    pdfBlob: Blob,
    pages: ImportPageMetadata[],
    signal?: AbortSignal,
  ): Promise<GeneratedThumbnail[]> {
    if (!pages.length) return [];

    let loadingTask: PDFDocumentLoadingTask | undefined;
    let pdf: PDFDocumentProxy | undefined;
    
    try {
      throwIfImportAborted(signal);

      const data = new Uint8Array(await pdfBlob.arrayBuffer());

      throwIfImportAborted(signal);

      loadingTask = pdfjsLib.getDocument({ data });

      pdf = await loadingTask.promise;

      const thumbnails: GeneratedThumbnail[] = [];

      for (let index = 0; index < pages.length; index++) {
        throwIfImportAborted(signal);

        const pageNumber = index + 1;
        const page = await pdf.getPage(pageNumber);

        try {
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = this.thumbnailWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Unable to create thumbnail canvas.");
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;

          throwIfImportAborted(signal);

          const blob = await this.canvasToBlob(canvas);

          thumbnails.push({
            pageNumber,
            blob,
            width: canvas.width,
            height: canvas.height,
          });

          canvas.width = 0;
          canvas.height = 0;
        } finally {
          page.cleanup();
        }
      }

      return thumbnails;
    } catch (error) {
      if (signal?.aborted) {
        throw new DocumentImportError({
          code: "IMPORT_CANCELLED",
          message: "Thumbnail generation was cancelled.",
          cause: error,
        });
      }

      if (error instanceof DocumentImportError) throw error;

      throw new DocumentImportError({
        code: "PDF_PROCESSING_FAILED",
        message: "Unable to generate document thumbnails.",
        cause: error,
      });
    } finally {
      if (pdf) await pdf.cleanup();
      else if (loadingTask) await loadingTask.destroy();
    }
  }

  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Thumbnail encoding failed."));
        },
        this.thumbnailType,
        this.thumbnailQuality,
      );
    });
  }
}
