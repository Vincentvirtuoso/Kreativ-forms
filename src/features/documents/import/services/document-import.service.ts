import { DOCUMENT_SCHEMA_VERSION } from "../../domain/document.rules";

import type {
  Document,
  DocumentPage,
  DocumentAsset,
  StoredDocumentAsset,
} from "../../domain/document.types";

import type {
  PreparedDocumentDraft,
  PreparedImport,
} from "../domain/prepared-document.types";

import { FileValidationService } from "./file-validation.service";
import { PdfInspectionService } from "./pdf-inspection.service";
import { ImageConversionService } from "./image-conversion.service";
import { ThumbnailService } from "./thumbnail.service";

import { getDocumentCreationRepository } from "../import-repository.factory";
import { throwIfImportAborted } from "../domain/import.rules";

import type {
  ImportProgress,
  ImportRequest,
  ImportResult,
  ImportCallbacks,
  ValidatedImportFile,
} from "../domain/import.types";

interface ImportUnit {
  inputs: ValidatedImportFile[];
  type: "pdf" | "images";
}

export class DocumentImportService {
  private readonly validator = new FileValidationService();
  private readonly inspector = new PdfInspectionService();
  private readonly converter = new ImageConversionService();
  private readonly thumbnails = new ThumbnailService();

  /**
   * Prepare selected files without saving them.
   */
  async prepare(request: ImportRequest): Promise<PreparedImport> {
    const { files, options, callbacks } = request;
    const signal = callbacks?.signal;

    const report = (progress: ImportProgress) => {
      callbacks?.onProgress?.(progress);
    };

    try {
      throwIfImportAborted(signal);

      report({
        stage: "validating",
        percentage: 0,
        message: "Validating selected files...",
      });

      const validated = await this.validator.validateMany(files, signal);

      this.validateOptions(validated, options);

      throwIfImportAborted(signal);

      const units = this.createImportUnits(validated, options.imageMode);
      const prepared: PreparedDocumentDraft[] = [];

      for (let index = 0; index < units.length; index++) {
        throwIfImportAborted(signal);

        const unit = units[index];
        const fileName = unit.inputs.map((input) => input.file.name).join(", ");

        report({
          stage: unit.type === "pdf" ? "inspecting" : "converting",
          percentage: Math.round((index / units.length) * 75),
          currentFile: fileName,
          currentFileIndex: index + 1,
          totalFiles: units.length,
          message: `Preparing ${fileName}...`,
        });

        const record = await this.prepareDocument(
          unit,
          options.persistence,
          signal,
          report,
        );

        prepared.push(record);
      }

      throwIfImportAborted(signal);

      report({
        stage: "preparing",
        percentage: 100,
        message: "Documents are ready for review.",
      });

      return { documents: prepared };
    } catch (error) {
      if (signal?.aborted) {
        report({
          stage: "cancelled",
          percentage: 0,
          message: "Import cancelled.",
        });

        throw error;
      }

      report({
        stage: "failed",
        percentage: 0,
        message:
          error instanceof Error
            ? error.message
            : "Document preparation failed.",
      });

      throw error;
    }
  }

  /**
   * Save reviewed documents.
   *
   * Each document is created through the atomic creation repository.
   * The batch itself is not transactional.
   */
  async commit(
    prepared: PreparedImport,
    callbacks?: ImportCallbacks,
  ): Promise<ImportResult> {
    const documents = prepared.documents;

    if (!documents.length) {
      throw new Error("There are no prepared documents to save.");
    }

    const persistence = documents[0].document.persistence;

    if (documents.some((item) => item.document.persistence !== persistence)) {
      throw new Error("All documents must use the same storage option.");
    }

    throwIfImportAborted(callbacks?.signal);

    const repository = getDocumentCreationRepository(persistence);
    const documentIds: string[] = [];

    callbacks?.onProgress?.({
      stage: "saving",
      percentage: 0,
      totalFiles: documents.length,
      message: "Saving documents...",
    });

    for (let index = 0; index < documents.length; index++) {
      const item = documents[index];

      await repository.createWithAssets(item);

      documentIds.push(item.document.id);

      callbacks?.onProgress?.({
        stage: "saving",
        percentage: Math.round(((index + 1) / documents.length) * 100),
        currentFile: item.document.name,
        currentFileIndex: index + 1,
        totalFiles: documents.length,
        message: `Saving ${item.document.name}...`,
      });
    }

    callbacks?.onProgress?.({
      stage: "completed",
      percentage: 100,
      message: "Documents saved successfully.",
    });

    return {
      documentIds,
      importedCount: documentIds.length,
      failedCount: 0,
    };
  }

  /**
   * Validate options against detected file types.
   */
  private validateOptions(
    inputs: ValidatedImportFile[],
    options: ImportRequest["options"],
  ): void {
    if (!["local", "session"].includes(options.persistence)) {
      throw new Error("Invalid document storage option.");
    }

    const hasImages = inputs.some(
      (input) => input.type === "png" || input.type === "jpg",
    );

    if (
      hasImages &&
      options.imageMode !== "separate" &&
      options.imageMode !== "combine"
    ) {
      throw new Error(
        "Choose whether images should be imported separately or combined.",
      );
    }
  }

  /**
   * Build import units while preserving the selection order.
   *
   * When combining images, the combined PDF occupies the position
   * of the first selected image.
   */
  private createImportUnits(
    inputs: ValidatedImportFile[],
    imageMode?: "separate" | "combine",
  ): ImportUnit[] {
    if (imageMode !== "combine") {
      return inputs.map((input) => ({
        type: input.type === "pdf" ? "pdf" : "images",
        inputs: [input],
      }));
    }

    const units: ImportUnit[] = [];
    const images = inputs.filter((input) => input.type !== "pdf");
    let imagesAdded = false;

    for (const input of inputs) {
      if (input.type === "pdf") {
        units.push({
          type: "pdf",
          inputs: [input],
        });

        continue;
      }

      if (!imagesAdded) {
        units.push({
          type: "images",
          inputs: images,
        });

        imagesAdded = true;
      }
    }

    return units;
  }

  private async prepareDocument(
    unit: ImportUnit,
    persistence: ImportRequest["options"]["persistence"],
    signal: AbortSignal | undefined,
    report: (progress: ImportProgress) => void,
  ): Promise<PreparedDocumentDraft> {
    throwIfImportAborted(signal);

    let sourceBlob: Blob;
    let sourceName: string;
    let inspectionInput: ValidatedImportFile;

    if (unit.type === "pdf") {
      const input = unit.inputs[0];

      sourceBlob = input.file.slice(0, input.file.size, "application/pdf");

      sourceName = input.file.name;
      inspectionInput = input;
    } else {
      const conversion =
        unit.inputs.length === 1
          ? await this.converter.convert(unit.inputs[0], signal)
          : await this.converter.combine(unit.inputs, signal);

      sourceBlob = conversion.blob;
      sourceName = conversion.fileName;

      const convertedFile = new File([sourceBlob], sourceName, {
        type: "application/pdf",
      });

      inspectionInput = {
        id: crypto.randomUUID(),
        file: convertedFile,
        type: "pdf",
        mimeType: "application/pdf",
        size: convertedFile.size,
      };
    }

    throwIfImportAborted(signal);

    report({
      stage: "inspecting",
      percentage: 40,
      currentFile: sourceName,
      message: "Inspecting PDF pages...",
    });

    const inspection = await this.inspector.inspect(inspectionInput, signal);

    throwIfImportAborted(signal);

    report({
      stage: "generating_thumbnails",
      percentage: 60,
      currentFile: sourceName,
      totalPages: inspection.pageCount,
      message: "Generating page thumbnails...",
    });

    // Shared ThumbnailService API.
    const thumbnailBlobs = await this.thumbnails.generateFromBlob(
      sourceBlob,
      signal,
    );

    throwIfImportAborted(signal);

    return this.buildDocumentRecord({
      sourceBlob,
      sourceName,
      originalImages: unit.type === "images" ? unit.inputs : [],
      pageMetadata: inspection.pages,
      generatedThumbnails: thumbnailBlobs,
      persistence,
    });
  }

  private async buildDocumentRecord(input: {
    sourceBlob: Blob;
    sourceName: string;
    originalImages: ValidatedImportFile[];
    pageMetadata: Awaited<ReturnType<PdfInspectionService["inspect"]>>["pages"];
    generatedThumbnails: Blob[];
    persistence: ImportRequest["options"]["persistence"];
  }): Promise<PreparedDocumentDraft> {
    const now = new Date().toISOString();

    const documentId = crypto.randomUUID();
    const sourceAssetId = crypto.randomUUID();
    const workingAssetId = crypto.randomUUID();

    const workingBlob = await this.cloneBlob(input.sourceBlob);

    const assets: StoredDocumentAsset[] = [];

    const sourceAsset = this.createAsset({
      id: sourceAssetId,
      documentId,
      type: "original_pdf",
      blob: input.sourceBlob,
      createdAt: now,
    });

    const workingAsset = this.createAsset({
      id: workingAssetId,
      documentId,
      type: "working_pdf",
      blob: workingBlob,
      createdAt: now,
    });

    assets.push(sourceAsset, workingAsset);

    // Preserve original image files alongside the generated PDF.
    for (const image of input.originalImages) {
      assets.push(
        this.createAsset({
          id: crypto.randomUUID(),
          documentId,
          type: "image",
          blob: image.file.slice(0, image.file.size, image.mimeType),
          createdAt: now,
        }),
      );
    }

    const thumbnailIds = new Map<number, string>();

    input.generatedThumbnails.forEach((thumbnail, index) => {
      const id = crypto.randomUUID();
      const pageNumber = index + 1;

      thumbnailIds.set(pageNumber, id);

      assets.push(
        this.createAsset({
          id,
          documentId,
          type: "thumbnail",
          blob: thumbnail,
          createdAt: now,
        }),
      );
    });

    const pages: DocumentPage[] = input.pageMetadata.map(
  (metadata, index) => ({
    id: crypto.randomUUID(),
    documentId,
    sourcePageNumber: metadata.sourcePageNumber,
    order: index,

    rotation: metadata.rotation,

    width: metadata.width,
    height: metadata.height,

    viewBox: metadata.viewBox,

    thumbnailAssetId: thumbnailIds.get(
      metadata.sourcePageNumber,
    ),
  }),
);

    if (pages.length !== input.generatedThumbnails.length) {
      throw new Error(
        "Thumbnail count does not match the document page count.",
      );
    }

    const document: Document = {
      id: documentId,
      name: this.getDocumentName(input.sourceName),
      status: "draft",
      sourceAssetId,
      workingAssetId,
      pageIds: pages.map((page) => page.id),
      persistence: input.persistence,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      sync: {
        status: "local",
      },
    };

    return { document, pages, assets };
  }

  private createAsset(input: {
    id: string;
    documentId: string;
    type: DocumentAsset["type"];
    blob: Blob;
    createdAt: string;
  }): StoredDocumentAsset {
    return {
      id: input.id,
      documentId: input.documentId,
      type: input.type,
      mimeType: input.blob.type || "application/octet-stream",
      size: input.blob.size,
      createdAt: input.createdAt,
      blob: input.blob,
    };
  }

  private async cloneBlob(blob: Blob): Promise<Blob> {
    const buffer = await blob.arrayBuffer();

    return new Blob([buffer], {
      type: blob.type,
    });
  }

  private getDocumentName(fileName: string): string {
    return (
      fileName
        .replace(/\.[^/.]+$/, "")
        .trim()
        .slice(0, 200) || "Untitled document"
    );
  }
}
