import { PDFDocument, StandardFonts } from "pdf-lib";

import type { HandwritingProfile } from "@/features/handwriting/domain/handwriting-profile.types";
import type { Annotation } from "@/features/editor/domain/annotation.types";

import { getHandwritingFontFamily } from "@/features/handwriting/services/handwriting-font-loader.service";

export type PdfFont = Awaited<ReturnType<PDFDocument["embedFont"]>>;

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

type StandardFontGroup = keyof StandardPdfFonts;

interface FontAsset {
  regular: string;
  bold: string;
}

const FONT_ASSETS: Record<string, FontAsset> = {
  "dm sans variable": {
    regular: "/fonts/dm-sans.ttf",
    bold: "/fonts/dm-sans.ttf",
  },
  inter: {
    regular: "/fonts/inter.ttf",
    bold: "/fonts/inter.ttf",
  },
  "inter variable": {
    regular: "/fonts/inter.ttf",
    bold: "/fonts/inter.ttf",
  },
  roboto: {
    regular: "/fonts/roboto.ttf",
    bold: "/fonts/roboto.ttf",
  },
  "roboto variable": {
    regular: "/fonts/roboto.ttf",
    bold: "/fonts/roboto.ttf",
  },
};

const STANDARD_FONT_GROUPS: Record<string, StandardFontGroup> = {
  arial: "helvetica",
  helvetica: "helvetica",
  "helvetica neue": "helvetica",

  georgia: "times",
  "times new roman": "times",
  times: "times",

  "courier new": "courier",
  courier: "courier",
};

function normalizeFamily(family: string): string {
  return family
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();
}

function isBold(weight: string | number | undefined): boolean {
  if (typeof weight === "number") return weight >= 600;

  return weight === "bold" || Number(weight) >= 600;
}

export class PdfFontService {
  async loadStandardFonts(pdf: PDFDocument): Promise<StandardPdfFonts> {
    const [helvetica, helveticaBold, times, timesBold, courier, courierBold] =
      await Promise.all([
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
    if (annotation.type !== "text" && annotation.type !== "date") {
      return standardFonts.helvetica.regular;
    }

    const family = annotation.style.fontFamily?.trim() ?? "";
    const bold = isBold(annotation.style.fontWeight);

    if (family.startsWith("KreativHandwriting-")) {
      return this.resolveHandwritingFont(family, profiles, pdf, cache);
    }

    // Empty family means the application default: DM Sans.
    const normalizedFamily = family
      ? normalizeFamily(family)
      : "dm sans variable";

    const asset = FONT_ASSETS[normalizedFamily];

    if (asset) {
      return this.embedFontAsset(
        asset[bold ? "bold" : "regular"],
        `builtin:${normalizedFamily}:${bold ? "bold" : "regular"}`,
        pdf,
        cache,
      );
    }

    const group = STANDARD_FONT_GROUPS[normalizedFamily];

    if (group) {
      return bold ? standardFonts[group].bold : standardFonts[group].regular;
    }

    throw new Error(
      `PDF export does not support the selected font "${family}".`,
    );
  }

  private async embedFontAsset(
    path: string,
    cacheKey: string,
    pdf: PDFDocument,
    cache: Map<string, PdfFont>,
  ): Promise<PdfFont> {
    const cached = cache.get(cacheKey);

    if (cached) return cached;

    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Unable to load PDF font asset: ${path}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    const embedded = await pdf.embedFont(bytes, {
      subset: false,
    });

    cache.set(cacheKey, embedded);

    return embedded;
  }

  private async resolveHandwritingFont(
    family: string,
    profiles: HandwritingProfile[],
    pdf: PDFDocument,
    cache: Map<string, PdfFont>,
  ): Promise<PdfFont> {
    const profile = profiles.find(
      (item) => getHandwritingFontFamily(item.id) === family,
    );

    if (!profile || profile.status !== "ready" || !profile.fontBlob) {
      throw new Error(
        `The handwriting font "${family}" is unavailable. ` +
          "Please regenerate or select another profile.",
      );
    }

    const cacheKey = `handwriting:${profile.id}`;
    const cached = cache.get(cacheKey);

    if (cached) return cached;

    const bytes = new Uint8Array(await profile.fontBlob.arrayBuffer());

    const embedded = await pdf.embedFont(bytes, {
      subset: false,
    });

    cache.set(cacheKey, embedded);

    return embedded;
  }
}
