import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import type { Annotation } from "@/features/editor/domain/annotation.types";
import type { DocumentId } from "../domain/document.types";
import type { DocumentLoaderService } from "./document-loader.service";

import type { AnnotationRepository } from "@/features/editor/repositories/annotation.repository";
import type { HandwritingProfileRepository } from "@/features/handwriting/repositories/handwriting-profile.repository";
import type { HandwritingProfile } from "@/features/handwriting/domain/handwriting-profile.types";

type PdfFont = Awaited<ReturnType<PDFDocument["embedFont"]>>;

interface ExportOptions {
  filename?: string;
  validateRequired?: boolean;
}

interface ExportResult {
  blob: Blob;
  filename: string;
}

export class PdfExportService {
  constructor(
    private readonly documents: DocumentLoaderService,
    private readonly annotations: AnnotationRepository,
    private readonly handwritingProfiles: HandwritingProfileRepository,
  ) {}

  async export(
    documentId: DocumentId,
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    const workspace = await this.documents.load(documentId);

    if (!workspace.workingPdf?.blob) {
      throw new Error("The working PDF could not be loaded.");
    }

    const [annotations, profiles] = await Promise.all([
      this.annotations.getByDocumentId(documentId),
      this.handwritingProfiles.getAll(),
    ]);

    if (options.validateRequired !== false) {
      this.validateRequiredAnnotations(annotations);
    }

    const pdf = await PDFDocument.load(
      await workspace.workingPdf.blob.arrayBuffer(),
    );

    pdf.registerFontkit(fontkit);

    const pdfPages = pdf.getPages();

    if (pdfPages.length !== workspace.pages.length) {
      throw new Error(
        "The working PDF page count does not match the document pages.",
      );
    }

    const fontCache = new Map<string, PdfFont>();

    const standardFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    for (const annotation of annotations) {
      const pageMetadata = workspace.pages.find(
        (page) => page.id === annotation.pageId,
      );

      if (!pageMetadata) {
        throw new Error(
          `Could not find the page for annotation ${annotation.id}.`,
        );
      }

      const page = pdfPages[pageMetadata.order];

      if (!page) {
        throw new Error(
          `Could not resolve PDF page ${pageMetadata.order + 1}.`,
        );
      }

      const font = await this.resolveFont(
        annotation,
        profiles,
        pdf,
        fontCache,
        standardFont,
        boldFont,
      );

      this.renderAnnotation(page, annotation, font);
    }

    const bytes = await pdf.save();

    const filename =
      options.filename ??
      `${this.sanitizeFilename(workspace.document.name)}.pdf`;

    return {
      blob: new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
      filename,
    };
  }

  private validateRequiredAnnotations(annotations: Annotation[]) {
    const missing = annotations.filter((annotation) => {
      if (!annotation.required) return false;

      switch (annotation.type) {
        case "text":
        case "date":
          return !annotation.value.trim();

        case "signature":
          return !annotation.value;

        case "checkbox":
          return !annotation.checked;
      }
    });

    if (missing.length > 0) {
      throw new Error(
        `${missing.length} required field(s) have not been completed.`,
      );
    }
  }

  private async resolveFont(
    annotation: Annotation,
    profiles: HandwritingProfile[],
    pdf: PDFDocument,
    cache: Map<string, PdfFont>,
    regular: PdfFont,
    bold: PdfFont,
  ): Promise<PdfFont> {
    if (annotation.type !== "text" && annotation.type !== "date") {
      return regular;
    }

    const family = annotation.style.fontFamily ?? "";

    if (family.startsWith("KreativHandwriting-")) {
      const profileId = family.replace("KreativHandwriting-", "");

      const profile = profiles.find(
        (item) => item.id === profileId && item.status === "ready",
      );

      if (!profile?.fontBlob) {
        throw new Error(`The handwriting font "${family}" could not be found.`);
      }

      const cached = cache.get(profile.id);

      if (cached) return cached;

      const embedded = await pdf.embedFont(
        new Uint8Array(await profile.fontBlob.arrayBuffer()),
        { subset: true },
      );

      cache.set(profile.id, embedded);

      return embedded;
    }

    return annotation.style.fontWeight === "bold" ? bold : regular;
  }

  private renderAnnotation(
    page: ReturnType<PDFDocument["getPages"]>[number],
    annotation: Annotation,
    font: PdfFont,
  ) {
    if (
      (annotation.type === "text" || annotation.type === "date") &&
      !annotation.value.trim()
    ) {
      return;
    }

    if (annotation.type === "signature" && !annotation.value) {
      return;
    }

    const rect = this.getPdfRect(page, annotation.position);
    const { x, y, width, height } = rect;
    const style = annotation.style;
    const opacity = style.opacity ?? 1;

    if (style.backgroundColor) {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: this.parseColor(style.backgroundColor),
        opacity,
      });
    }

    if (style.borderColor && (style.borderWidth ?? 0) > 0) {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: this.parseColor(style.borderColor),
        borderWidth: style.borderWidth,
        opacity,
      });
    }

    switch (annotation.type) {
      case "text":
      case "date": {
        this.drawText(page, annotation.value, rect, font, style, opacity);
        break;
      }

      case "checkbox": {
        if (annotation.checked) {
          const inset = Math.min(width, height) * 0.2;

          page.drawLine({
            start: { x: x + inset, y: y + height * 0.48 },
            end: { x: x + width * 0.43, y: y + inset },
            thickness: Math.max(1, width * 0.07),
            color: this.parseColor(style.color ?? "#111827"),
            opacity,
          });

          page.drawLine({
            start: { x: x + width * 0.43, y: y + inset },
            end: { x: x + width - inset, y: y + height - inset },
            thickness: Math.max(1, width * 0.07),
            color: this.parseColor(style.color ?? "#111827"),
            opacity,
          });
        }
        break;
      }

      case "signature": {
        if (annotation.value) {
          void this.drawSignature(page, annotation.value, rect, opacity);
        }
        break;
      }
    }
  }

  private drawText(
    page: ReturnType<PDFDocument["getPages"]>[number],
    value: string,
    rect: { x: number; y: number; width: number; height: number },
    font: PdfFont,
    style: Annotation["style"],
    opacity: number,
  ) {
    const fontSize = Math.max(1, (style.fontSize ?? 16) * 0.75);
    const padding = 2;
    const maxWidth = Math.max(1, rect.width - padding * 2);
    const lineHeight = fontSize * 1.2;

    const lines = this.wrapText(value, font, fontSize, maxWidth);

    let currentY = rect.y + rect.height - fontSize - padding;

    for (const line of lines) {
      if (currentY < rect.y) break;

      const textWidth = font.widthOfTextAtSize(line, fontSize);

      let textX = rect.x + padding;

      if (style.textAlign === "center") {
        textX = rect.x + (rect.width - textWidth) / 2;
      } else if (style.textAlign === "right") {
        textX = rect.x + rect.width - textWidth - padding;
      }

      page.drawText(line, {
        x: textX,
        y: currentY,
        size: fontSize,
        font,
        color: this.parseColor(style.color ?? "#111827"),
        opacity,
      });

      currentY -= lineHeight;
    }
  }

  private wrapText(
    value: string,
    font: PdfFont,
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const paragraphs = value.split(/\r?\n/);
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/);
      let line = "";

      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;

        if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }

      lines.push(line);
    }

    return lines;
  }

  private async drawSignature(
    page: ReturnType<PDFDocument["getPages"]>[number],
    dataUrl: string,
    rect: { x: number; y: number; width: number; height: number },
    opacity: number,
  ) {
    const { bytes, mimeType } = this.decodeDataUrl(dataUrl);

    const image =
      mimeType === "image/png"
        ? await page.doc.embedPng(bytes)
        : await page.doc.embedJpg(bytes);

    const dimensions = image.scaleToFit(rect.width, rect.height);

    page.drawImage(image, {
      x: rect.x + (rect.width - dimensions.width) / 2,
      y: rect.y + (rect.height - dimensions.height) / 2,
      width: dimensions.width,
      height: dimensions.height,
      opacity,
    });
  }

  private decodeDataUrl(dataUrl: string) {
    const match = dataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i,
    );

    if (!match) {
      throw new Error("Unsupported signature image format.");
    }

    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return {
      bytes,
      mimeType: match[1].toLowerCase(),
    };
  }

  private getPdfRect(
    page: ReturnType<PDFDocument["getPages"]>[number],
    position: Annotation["position"],
  ) {
    const pdfSize = page.getSize();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;

    const left = position.x / 100;
    const top = position.y / 100;
    const right = left + position.width / 100;
    const bottom = top + position.height / 100;

    const transform = (x: number, y: number) => {
      switch (rotation) {
        case 90:
          return { x: 1 - y, y: x };
        case 180:
          return { x: 1 - x, y };
        case 270:
          return { x: y, y: 1 - x };
        default:
          return { x, y: 1 - y };
      }
    };

    const corners = [
      transform(left, top),
      transform(right, top),
      transform(left, bottom),
      transform(right, bottom),
    ];

    const minX = Math.min(...corners.map((point) => point.x));
    const maxX = Math.max(...corners.map((point) => point.x));
    const minY = Math.min(...corners.map((point) => point.y));
    const maxY = Math.max(...corners.map((point) => point.y));

    return {
      x: minX * pdfSize.width,
      y: minY * pdfSize.height,
      width: (maxX - minX) * pdfSize.width,
      height: (maxY - minY) * pdfSize.height,
    };
  }

  private parseColor(value: string) {
    const hex = value.replace("#", "");

    if (!/^[0-9a-f]{6}$/i.test(hex)) {
      return rgb(0, 0, 0);
    }

    return rgb(
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    );
  }

  private sanitizeFilename(value: string) {
    return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").trim() || "document";
  }
}
