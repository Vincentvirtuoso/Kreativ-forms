import {
  PDFDocument,
  StandardFonts,
} from "pdf-lib";

import type { HandwritingProfile } from "@/features/handwriting/domain/handwriting-profile.types";
import type { Annotation } from "@/features/editor/domain/annotation.types";

import { getHandwritingFontFamily } from "@/features/handwriting/services/handwriting-font-loader.service";

export type PdfFont = Awaited<
  ReturnType<PDFDocument["embedFont"]>
>;

export interface StandardPdfFonts {
  helvetica: {
    regular: PdfFont;
    bold: PdfFont;
  };
  times: {
    regular: PdfFont;
    bold: PdfFont;
  };
  courier: {
    regular: PdfFont;
    bold: PdfFont;
  };
}

export class PdfFontService {
  async loadStandardFonts(
    pdf: PDFDocument,
  ): Promise<StandardPdfFonts> {
    const [
      helvetica,
      helveticaBold,
      times,
      timesBold,
      courier,
      courierBold,
    ] = await Promise.all([
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.TimesRoman),
      pdf.embedFont(StandardFonts.TimesRomanBold),
      pdf.embedFont(StandardFonts.Courier),
      pdf.embedFont(StandardFonts.CourierBold),
    ]);

    return {
      helvetica: {
        regular: helvetica,
        bold: helveticaBold,
      },
      times: {
        regular: times,
        bold: timesBold,
      },
      courier: {
        regular: courier,
        bold: courierBold,
      },
    };
  }

  async resolve(
    annotation: Annotation,
    profiles: HandwritingProfile[],
    pdf: PDFDocument,
    cache: Map<string, PdfFont>,
    standardFonts: StandardPdfFonts,
  ): Promise<PdfFont> {
    if (
      annotation.type !== "text" &&
      annotation.type !== "date"
    ) {
      return standardFonts.helvetica.regular;
    }

    const family = annotation.style.fontFamily ?? "";
    const bold = annotation.style.fontWeight === "bold";

    if (family.startsWith("KreativHandwriting-")) {
      return this.resolveHandwritingFont(
        family,
        profiles,
        pdf,
        cache,
      );
    }

    if (
      family.includes("Georgia") ||
      family.includes("Times New Roman")
    ) {
      return bold
        ? standardFonts.times.bold
        : standardFonts.times.regular;
    }

    if (family.includes("Courier New")) {
      return bold
        ? standardFonts.courier.bold
        : standardFonts.courier.regular;
    }

    return bold
      ? standardFonts.helvetica.bold
      : standardFonts.helvetica.regular;
  }

  private async resolveHandwritingFont(
    family: string,
    profiles: HandwritingProfile[],
    pdf: PDFDocument,
    cache: Map<string, PdfFont>,
  ): Promise<PdfFont> {
    const profile = profiles.find(
      (item) =>
        getHandwritingFontFamily(item.id) === family &&
        item.status === "ready",
    );

    if (!profile?.fontBlob) {
      throw new Error(
        `The handwriting font "${family}" could not be found or has no generated font data.`,
      );
    }

    const cacheKey = `handwriting:${profile.id}`;
    const cached = cache.get(cacheKey);

    if (cached) return cached;

    const bytes = new Uint8Array(
      await profile.fontBlob.arrayBuffer(),
    );

    const embedded = await pdf.embedFont(bytes, {
      subset: false,
    });

    cache.set(cacheKey, embedded);

    return embedded;
  }
}