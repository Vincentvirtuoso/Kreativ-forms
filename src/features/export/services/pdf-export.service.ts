import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import type { DocumentId } from "../../documents/domain/document.types";
import type { DocumentLoaderService } from "../../documents/services/document-loader.service";

import type { AnnotationRepository } from "@/features/editor/repositories/annotation.repository";
import type { HandwritingProfileRepository } from "@/features/handwriting/repositories/handwriting-profile.repository";

import { PdfFontService } from "./pdf-font.service";
import { PdfViewportService } from "./pdf-viewport.service";
import { PdfExportValidationService } from "./pdf-export-validation.service";
import { PdfAnnotationRendererService } from "./pdf-annotation-renderer.service";

import type { PdfFont } from "./pdf-font.service";

import type { ExportOptions, ExportResult } from "../domain/export.types";

export class PdfExportService {
  constructor(
    private readonly documents: DocumentLoaderService,
    private readonly annotations: AnnotationRepository,
    private readonly handwritingProfiles: HandwritingProfileRepository,
    private readonly fontService = new PdfFontService(),
    private readonly annotationRenderer = new PdfAnnotationRendererService(),
    private readonly viewportService = new PdfViewportService(),
    private readonly validationService = new PdfExportValidationService(),
  ) {}

  async export(
    documentId: DocumentId,
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    const workspace = await this.documents.load(documentId);

    if (!workspace.workingPdf?.blob) {
      throw new Error("The working PDF could not be loaded.");
    }

    const [allAnnotations, profiles] = await Promise.all([
      this.annotations.getByDocumentId(documentId),
      this.handwritingProfiles.getAll(),
    ]);

    const sourcePdf = await PDFDocument.load(
      await workspace.workingPdf.blob.arrayBuffer(),
    );

    const sourcePages = sourcePdf.getPages();

    if (sourcePages.length !== workspace.pages.length) {
      throw new Error(
        "The working PDF page count does not match the document pages.",
      );
    }

    const selectedPages = this.validationService.selectPages(
      workspace,
      options,
      sourcePages.length,
    );

    const selectedPageIds =
      this.validationService.getSelectedPageIds(selectedPages);

    const viewportGeometries = await this.viewportService.getGeometries(
      workspace.workingPdf.blob,
      selectedPages,
    );

    const annotations = allAnnotations.filter((annotation) =>
      selectedPageIds.has(annotation.pageId),
    );

    if (options.validateRequired !== false) {
      this.validationService.validateRequiredAnnotations(annotations);
    }

    const pdf = await PDFDocument.create();

    pdf.registerFontkit(fontkit);

    const copiedPages = await pdf.copyPages(
      sourcePdf,
      selectedPages.map((page) => page.order),
    );

    copiedPages.forEach((page) => pdf.addPage(page));

    const pdfPages = pdf.getPages();

    const pageMap = new Map(
      selectedPages.map((metadata, index) => [metadata.id, pdfPages[index]]),
    );

    const fontCache = new Map<string, PdfFont>();
    const standardFonts = await this.fontService.loadStandardFonts(pdf);

    for (const annotation of annotations) {
      const page = pageMap.get(annotation.pageId);
      const viewport = viewportGeometries.get(annotation.pageId);

      if (!page || !viewport) {
        throw new Error(
          `Could not resolve the exported page for annotation ${annotation.id}.`,
        );
      }

      const font = await this.fontService.resolve(
        annotation,
        profiles,
        pdf,
        fontCache,
        standardFonts,
      );

      await this.annotationRenderer.render(page, annotation, font, viewport);
    }

    const bytes = await pdf.save();

    const filename =
      options.filename ??
      `${this.sanitizeFilename(workspace.document.name)}.pdf`;

    return {
      blob: new Blob([Uint8Array.from(bytes)], {
        type: "application/pdf",
      }),
      filename,
    };
  }

  private sanitizeFilename(value: string): string {
    return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").trim() || "document";
  }
}
