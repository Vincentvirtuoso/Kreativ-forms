import * as opentype from "opentype.js";

import type {
  GeneratedHandwritingFont,
  ProcessedGlyph,
} from "../domain/handwriting.types";

const UNITS_PER_EM = 1000;
const DEFAULT_ADVANCE_WIDTH = 600;

function getSignedArea(points: [number, number][]) {
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    area += current[0] * next[1] - next[0] * current[1];
  }

  return area / 2;
}

export class FontGenerationService {
  generate(
    name: string,
    processedGlyphs: ProcessedGlyph[],
  ): GeneratedHandwritingFont {
    const familyName = name.trim();

    if (!familyName) {
      throw new Error("A font family name is required.");
    }

    if (!processedGlyphs.length) {
      throw new Error("At least one glyph is required.");
    }

    const seen = new Set<number>();

    const glyphs: opentype.Glyph[] = [
      new opentype.Glyph({
        name: ".notdef",
        advanceWidth: DEFAULT_ADVANCE_WIDTH,
        path: new opentype.Path(),
      }),
      new opentype.Glyph({
        name: "space",
        unicode: 32,
        advanceWidth: 300,
        path: new opentype.Path(),
      }),
    ];

    for (const item of processedGlyphs) {
      const characters = Array.from(item.character);

      if (characters.length !== 1) {
        throw new Error(`Invalid glyph character: "${item.character}".`);
      }

      const codePoint = item.character.codePointAt(0)!;

      // The initial font prototype targets the BMP cmap.
      if (codePoint > 0xffff || codePoint === 32) {
        throw new Error(
          `Unsupported or reserved character: "${item.character}".`,
        );
      }

      if (seen.has(codePoint)) {
        throw new Error(`Duplicate glyph mapping: "${item.character}".`);
      }

      seen.add(codePoint);

      if (!Number.isFinite(item.advanceWidth) || item.advanceWidth <= 0) {
        throw new Error(`Invalid advance width for "${item.character}".`);
      }

      const path = new opentype.Path();

      for (const contour of item.contours) {
        if (contour.length < 3) continue;

        // TrueType outer contours should be clockwise
        // in the font's y-up coordinate system.
        const points =
          getSignedArea(contour) > 0 ? [...contour].reverse() : contour;

        const [[firstX, firstY], ...remaining] = points;

        path.moveTo(firstX, firstY);

        for (const [x, y] of remaining) {
          path.lineTo(x, y);
        }

        path.close();
      }

      if (!path.commands.length) {
        throw new Error(`No valid outline for "${item.character}".`);
      }

      glyphs.push(
        new opentype.Glyph({
          name: `uni${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
          unicode: codePoint,
          advanceWidth: Math.ceil(item.advanceWidth),
          path,
        }),
      );
    }

    const font = new opentype.Font({
      familyName,
      styleName: "Regular",
      unitsPerEm: UNITS_PER_EM,
      ascender: 800,
      descender: -200,
      glyphs,
    });

    const buffer = font.toArrayBuffer();

    return {
      name: familyName,
      format: "ttf",
      blob: new Blob([buffer], {
        type: "font/ttf",
      }),
    };
  }
}

export const fontGenerationService = new FontGenerationService();
