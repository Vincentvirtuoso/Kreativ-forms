import { degrees, PDFDocument } from "pdf-lib";

import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
} from "pdfjs-dist/types/src/display/api";

import type {
  DocumentPage,
  PageRotation,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import type { PreparedDocumentDraft } from "../domain/prepared-document.types";
import { ThumbnailService } from "./thumbnail.service";

import { FileValidationService } from "./file-validation.service";
import { PdfInspectionService } from "./pdf-inspection.service";
import { ImageConversionService } from "./image-conversion.service";

import { throwIfImportAborted } from "../domain/import.rules";
import type { ValidatedImportFile } from "../domain/import.types";
import { pdfjsLib } from "@/engines/pdf/pdfjs.client";

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 0.8;
const THUMBNAIL_MIME_TYPE = "image/webp";

export class DocumentPreparationService {
  constructor(
    private readonly thumbnailService = new ThumbnailService(),
    private readonly validator = new FileValidationService(),
    private readonly inspector = new PdfInspectionService(),
    private readonly converter = new ImageConversionService(),
  ) {}
  async reorderPages(
    draft: PreparedDocumentDraft,
    orderedPageIds: string[],
  ): Promise<PreparedDocumentDraft> {
    const pages = this.getOrderedPages(draft);

    this.validatePageOrder(pages, orderedPageIds);

    const orderedPages = orderedPageIds.map(
      (id) => pages.find((page) => page.id === id)!,
    );

    return this.rebuildPdf(draft, orderedPages);
  }

  async rotatePage(
    draft: PreparedDocumentDraft,
    pageId: string,
    rotation: 90 | 180 | 270,
  ): Promise<PreparedDocumentDraft> {
    const pages = this.getOrderedPages(draft);
    const targetIndex = pages.findIndex((page) => page.id === pageId);

    if (targetIndex === -1) {
      throw new Error("Page not found.");
    }

    const updatedPages = pages.map((page, index) => {
      if (index !== targetIndex) return page;

      const nextRotation = ((page.rotation + rotation) % 360) as PageRotation;

      const swapsDimensions = page.rotation % 180 !== nextRotation % 180;

      return {
        ...page,
        rotation: nextRotation,
        width: swapsDimensions ? page.height : page.width,
        height: swapsDimensions ? page.width : page.height,
      };
    });

    return this.rebuildPdf(draft, updatedPages, {
      pageId,
      rotation,
    });
  }

  async removePage(
    draft: PreparedDocumentDraft,
    pageId: string,
  ): Promise<PreparedDocumentDraft> {
    const pages = this.getOrderedPages(draft);
    const remainingPages = pages.filter((page) => page.id !== pageId);

    if (remainingPages.length === pages.length) {
      throw new Error("Page not found.");
    }

    if (!remainingPages.length) {
      throw new Error("A document must contain at least one page.");
    }

    return this.rebuildPdf(draft, remainingPages);
  }

  private getOrderedPages(draft: PreparedDocumentDraft): DocumentPage[] {
    return [...draft.pages].sort((a, b) => a.order - b.order);
  }

  private validatePageOrder(
    pages: DocumentPage[],
    orderedPageIds: string[],
  ): void {
    if (
      orderedPageIds.length !== pages.length ||
      new Set(orderedPageIds).size !== pages.length ||
      orderedPageIds.some((id) => !pages.some((page) => page.id === id))
    ) {
      throw new Error("Invalid page ordering.");
    }
  }

  private async rebuildPdf(
    draft: PreparedDocumentDraft,
    pages: DocumentPage[],
    rotationChange?: {
      pageId: string;
      rotation: 90 | 180 | 270;
    },
  ): Promise<PreparedDocumentDraft> {
    const workingAsset = draft.assets.find(
      (asset) =>
        asset.id === draft.document.workingAssetId &&
        asset.type === "working_pdf",
    );

    if (!workingAsset) {
      throw new Error("Working PDF asset not found.");
    }

    const sourcePdf = await PDFDocument.load(
      await workingAsset.blob.arrayBuffer(),
    );

    const sourcePages = this.getOrderedPages(draft);

    if (sourcePdf.getPageCount() !== sourcePages.length) {
      throw new Error("PDF pages do not match document metadata.");
    }

    const outputPdf = await PDFDocument.create();

    const sourceIndexes = pages.map((page) =>
      sourcePages.findIndex((sourcePage) => sourcePage.id === page.id),
    );

    if (sourceIndexes.some((index) => index === -1)) {
      throw new Error("A page reference is missing.");
    }

    const copiedPages = await outputPdf.copyPages(sourcePdf, sourceIndexes);

    copiedPages.forEach((page, index) => {
      const originalPage = sourcePdf.getPage(sourceIndexes[index]);

      if (pages[index].id === rotationChange?.pageId) {
        const currentAngle = originalPage.getRotation().angle;

        page.setRotation(
          degrees((currentAngle + rotationChange.rotation) % 360),
        );
      }

      outputPdf.addPage(page);
    });

    const bytes = await outputPdf.save();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);

    const updatedBlob = new Blob([buffer], {
      type: "application/pdf",
    });

    const thumbnailBlobs =
      await this.thumbnailService.generateFromBlob(updatedBlob);

    const now = new Date().toISOString();

    const thumbnailAssets: StoredDocumentAsset[] = thumbnailBlobs.map(
      (blob, index) => ({
        id: crypto.randomUUID(),
        documentId: draft.document.id,
        type: "thumbnail",
        mimeType: THUMBNAIL_MIME_TYPE,
        size: blob.size,
        createdAt: now,
        blob,
      }),
    );

    const updatedPages = pages.map((page, index) => ({
      ...page,
      order: index,
      thumbnailAssetId: thumbnailAssets[index]?.id,
    }));

    const updatedAssets: StoredDocumentAsset[] = [
      ...draft.assets
        .filter((asset) => asset.type !== "thumbnail")
        .map((asset) =>
          asset.id === workingAsset.id
            ? {
                ...asset,
                blob: updatedBlob,
                size: updatedBlob.size,
                createdAt: now,
              }
            : asset,
        ),
      ...thumbnailAssets,
    ];

    return {
      ...draft,
      document: {
        ...draft.document,
        pageIds: updatedPages.map((page) => page.id),
        updatedAt: now,
      },
      pages: updatedPages,
      assets: updatedAssets,
    };
  }

  private async generateThumbnails(blob: Blob): Promise<Blob[]> {
    const data = new Uint8Array(await blob.arrayBuffer());

    let loadingTask: PDFDocumentLoadingTask | undefined;
    let pdf: PDFDocumentProxy | undefined;

    try {
      loadingTask = pdfjsLib.getDocument({ data });
      pdf = await loadingTask.promise;

      const thumbnails: Blob[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
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
          await page.render({
            canvasContext: context,
            canvas,
            viewport,
          }).promise;

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
    } finally {
      if (pdf) {
        await pdf.cleanup();
      } else if (loadingTask) {
        await loadingTask.destroy();
      }
    }
  }

  async addPages(
    draft: PreparedDocumentDraft,
    files: File[],
    signal?: AbortSignal,
  ): Promise<PreparedDocumentDraft> {
    throwIfImportAborted(signal);

    if (!files.length) {
      throw new Error("Select at least one file to add.");
    }

    const validated = await this.validator.validateMany(files, signal);

    throwIfImportAborted(signal);

    const workingAsset = draft.assets.find(
      (asset) =>
        asset.id === draft.document.workingAssetId &&
        asset.type === "working_pdf",
    );

    if (!workingAsset) {
      throw new Error("Working PDF asset not found.");
    }

    const sourcePdf = await PDFDocument.load(
      await workingAsset.blob.arrayBuffer(),
    );

    const existingPages = [...draft.pages].sort((a, b) => a.order - b.order);

    if (sourcePdf.getPageCount() !== existingPages.length) {
      throw new Error("PDF pages do not match document metadata.");
    }

    const outputPdf = await PDFDocument.create();

    // Copy existing pages first.
    const existingCopies = await outputPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices(),
    );

    existingCopies.forEach((page) => outputPdf.addPage(page));

    const appendedMetadata: Array<{
      width: number;
      height: number;
      viewBox: DocumentPage["viewBox"];
    }> = [];

    const addedImageAssets: StoredDocumentAsset[] = [];

    // Append each selected PDF or image in selection order.
    for (const input of validated) {
      throwIfImportAborted(signal);

      let pdfBlob: Blob;

      if (input.type === "pdf") {
        pdfBlob = input.file.slice(0, input.file.size, "application/pdf");
      } else {
        const conversion = await this.converter.convert(input, signal);
        pdfBlob = conversion.blob;

        // Retain the original image as an asset.
        addedImageAssets.push({
          id: crypto.randomUUID(),
          documentId: draft.document.id,
          type: "image",
          mimeType: input.mimeType,
          size: input.file.size,
          createdAt: new Date().toISOString(),
          blob: input.file.slice(0, input.file.size, input.mimeType),
        });
      }

      throwIfImportAborted(signal);

      const convertedFile = new File(
        [pdfBlob],
        input.file.name.replace(/\.(png|jpe?g)$/i, ".pdf"),
        { type: "application/pdf" },
      );

      const inspectionInput: ValidatedImportFile = {
        id: crypto.randomUUID(),
        file: convertedFile,
        type: "pdf",
        mimeType: "application/pdf",
        size: convertedFile.size,
      };

      const inspection = await this.inspector.inspect(inspectionInput, signal);

      throwIfImportAborted(signal);

      const importedPdf = await PDFDocument.load(await pdfBlob.arrayBuffer());

      if (importedPdf.getPageCount() !== inspection.pageCount) {
        throw new Error("Imported PDF page count mismatch.");
      }

      const copiedPages = await outputPdf.copyPages(
        importedPdf,
        importedPdf.getPageIndices(),
      );

      copiedPages.forEach((page, index) => {
        outputPdf.addPage(page);

        appendedMetadata.push({
          width: inspection.pages[index].width,
          height: inspection.pages[index].height,
          viewBox: inspection.pages[index].viewBox,
        });
      });
    }

    throwIfImportAborted(signal);

    const bytes = await outputPdf.save();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);

    const updatedBlob = new Blob([buffer], {
      type: "application/pdf",
    });

    // Regenerate thumbnails for the complete updated document.
    const thumbnailBlobs = await this.thumbnailService.generateFromBlob(
      updatedBlob,
      signal,
    );

    throwIfImportAborted(signal);

    const now = new Date().toISOString();

    const newPages: DocumentPage[] = appendedMetadata.map(
      (metadata, index) => ({
        id: crypto.randomUUID(),
        documentId: draft.document.id,
        sourcePageNumber: existingPages.length + index + 1,
        order: existingPages.length + index,
        rotation: 0,
        width: metadata.width,
        height: metadata.height,
        viewBox: metadata.viewBox,
      }),
    );

    const allPages = [...existingPages, ...newPages];

    if (thumbnailBlobs.length !== allPages.length) {
      throw new Error("Updated thumbnail count is incorrect.");
    }

    const thumbnailAssets: StoredDocumentAsset[] = thumbnailBlobs.map(
      (blob, index) => {
        const id = crypto.randomUUID();

        allPages[index] = {
          ...allPages[index],
          thumbnailAssetId: id,
        };

        return {
          id,
          documentId: draft.document.id,
          type: "thumbnail",
          mimeType: "image/webp",
          size: blob.size,
          createdAt: now,
          blob,
        };
      },
    );

    const updatedAssets: StoredDocumentAsset[] = [
      ...draft.assets
        .filter((asset) => asset.type !== "thumbnail")
        .map((asset) =>
          asset.id === workingAsset.id
            ? {
                ...asset,
                blob: updatedBlob,
                size: updatedBlob.size,
                createdAt: now,
              }
            : asset,
        ),
      ...addedImageAssets,
      ...thumbnailAssets,
    ];

    return {
      ...draft,
      document: {
        ...draft.document,
        pageIds: allPages.map((page) => page.id),
        updatedAt: now,
      },
      pages: allPages,
      assets: updatedAssets,
    };
  }
}
