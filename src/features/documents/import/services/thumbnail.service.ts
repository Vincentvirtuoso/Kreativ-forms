import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
} from "pdfjs-dist/types/src/display/api";

import { DocumentImportError } from "../domain/import.errors";
import { throwIfImportAborted } from "../domain/import.rules";
import type { ValidatedImportFile } from "../domain/import.types";
import { pdfjsLib } from "@/engines/pdf/pdfjs.client";

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 0.8;
const THUMBNAIL_MIME_TYPE = "image/webp";

export class ThumbnailService {
  async generate(
    input: ValidatedImportFile,
    signal?: AbortSignal,
  ): Promise<Blob[]> {
    if (input.type !== "pdf") {
      throw new DocumentImportError({
        code: "INVALID_FILE_TYPE",
        message: "Thumbnails can only be generated from PDF files.",
        fileName: input.file.name,
      });
    }

    return this.generateFromBlob(
      new Blob([await input.file.arrayBuffer()], {
        type: "application/pdf",
      }),
      signal,
    );
  }

  async generateFromBlob(blob: Blob, signal?: AbortSignal): Promise<Blob[]> {
    throwIfImportAborted(signal);

    let loadingTask: PDFDocumentLoadingTask | undefined;
    let pdf: PDFDocumentProxy | undefined;

    try {
      const data = new Uint8Array(await blob.arrayBuffer());
      throwIfImportAborted(signal);

      loadingTask = pdfjsLib.getDocument({ data });
      pdf = await loadingTask.promise;

      const thumbnails: Blob[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        throwIfImportAborted(signal);

        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to create thumbnail canvas.");
        }

        try {
          const renderTask = page.render({
            canvasContext: context,
            canvas,
            viewport,
          });

          const cancelRender = () => renderTask.cancel();
          signal?.addEventListener("abort", cancelRender, { once: true });

          try {
            await renderTask.promise;
          } finally {
            signal?.removeEventListener("abort", cancelRender);
          }

          throwIfImportAborted(signal);

          const thumbnail = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (result) => {
                if (result) resolve(result);
                else reject(new Error("Unable to generate page thumbnail."));
              },
              THUMBNAIL_MIME_TYPE,
              THUMBNAIL_QUALITY,
            );
          });

          thumbnails.push(thumbnail);
        } finally {
          page.cleanup();
          canvas.width = 0;
          canvas.height = 0;
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

      throw error;
    } finally {
      if (pdf) await pdf.cleanup();
      else if (loadingTask) await loadingTask.destroy();
    }
  }
}
