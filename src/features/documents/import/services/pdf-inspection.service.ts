import { pdfjsLib } from "@/engines/pdf/pdfjs.client";
import { DocumentImportError } from "../domain/import.errors";

import { throwIfImportAborted } from "../domain/import.rules";

import type {
  ImportPageMetadata,
  ValidatedImportFile,
} from "../domain/import.types";

import "@/engines/pdf/renderer/pdfjs-worker";

export interface PdfInspectionResult {
  pageCount: number;
  pages: ImportPageMetadata[];
  version?: string;
  fingerprint?: string;
}

export class PdfInspectionService {
  async inspect(
    input: ValidatedImportFile,
    signal?: AbortSignal,
  ): Promise<PdfInspectionResult> {
    if (input.type !== "pdf") {
      throw new DocumentImportError({
        code: "INVALID_FILE_TYPE",
        message: "PdfInspectionService only accepts PDF files.",
        fileName: input.file.name,
      });
    }

    throwIfImportAborted(signal);

    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | undefined;
    let pdf:
      | Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>
      | undefined;

    try {
      const data = new Uint8Array(await input.file.arrayBuffer());

      throwIfImportAborted(signal);

      loadingTask = pdfjsLib.getDocument({
        data,
      });

      const abortHandler = () => {
        void loadingTask?.destroy();
      };

      signal?.addEventListener("abort", abortHandler, { once: true });

      try {
        pdf = await loadingTask.promise;
      } finally {
        signal?.removeEventListener("abort", abortHandler);
      }

      throwIfImportAborted(signal);

      const pages: ImportPageMetadata[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        throwIfImportAborted(signal);

        const page = await pdf.getPage(pageNumber);

        try {
          const viewport = page.getViewport({ scale: 1 });

          const [x1, y1, x2, y2] = page.view;

          pages.push({
            sourcePageNumber: pageNumber,

            width: viewport.width,
            height: viewport.height,

            rotation: (((page.rotate % 360) + 360) % 360) as 0 | 90 | 180 | 270,

            viewBox: {
              x: x1,
              y: y1,
              width: x2 - x1,
              height: y2 - y1,
            },
          });
        } finally {
          page.cleanup();
        }
      }

      return {
        pageCount: pdf.numPages,
        pages,
        version: pdfjsLib.version,
        fingerprint: pdf.fingerprints?.[0] || undefined,
      };
    } catch (error) {
      if (signal?.aborted) {
        throw new DocumentImportError({
          code: "IMPORT_CANCELLED",
          message: "PDF inspection was cancelled.",
          fileName: input.file.name,
          cause: error,
        });
      }

      if (this.isPasswordError(error)) {
        throw new DocumentImportError({
          code: "PASSWORD_PROTECTED_PDF",
          message: `"${input.file.name}" is password-protected.`,
          fileName: input.file.name,
          cause: error,
        });
      }

      throw new DocumentImportError({
        code: "CORRUPTED_PDF",
        message: `"${input.file.name}" is corrupted or cannot be opened.`,
        fileName: input.file.name,
        cause: error,
      });
    } finally {
      if (pdf) {
        await pdf.cleanup();
      } else if (loadingTask) {
        await loadingTask.destroy();
      }
    }
  }

  private isPasswordError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const candidate = error as {
      name?: string;
      code?: number;
    };

    return (
      candidate.name === "PasswordException" ||
      candidate.code === 1 ||
      candidate.code === 2
    );
  }
}
