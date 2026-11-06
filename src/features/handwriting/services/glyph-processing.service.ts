import { getStroke } from "perfect-freehand";

import {
  GLYPH_VIEWBOX,
  type CapturedGlyph,
  type GlyphContour,
  type ProcessedGlyph,
  type StrokePoint,
} from "../domain/handwriting.types";

const FONT_SCALE = 1.25;
const SIDE_BEARING = 50;

export class GlyphProcessingService {
  process(input: CapturedGlyph): ProcessedGlyph {
    if (!input.character || input.character.length !== 1) {
      throw new Error("A glyph must represent exactly one character.");
    }

    if (!input.strokes.length) {
      throw new Error(`No strokes captured for "${input.character}".`);
    }

    const outlines = input.strokes
      .filter((stroke) => stroke.length > 0)
      .map((stroke) => this.createOutline(stroke))
      .filter((outline) => outline.length >= 3);

    if (!outlines.length) {
      throw new Error(
        `Could not generate an outline for "${input.character}".`,
      );
    }

    const points = outlines.flat();

    const minX = Math.min(...points.map(([x]) => x));
    const maxX = Math.max(...points.map(([x]) => x));

    const contours: GlyphContour[] = outlines.map((outline) =>
      outline.map(([x, y]) => [
        Math.round((x - minX) * FONT_SCALE + SIDE_BEARING),
        Math.round((GLYPH_VIEWBOX.baseline - y) * FONT_SCALE),
      ]),
    );

    const advanceWidth = Math.ceil(
      (maxX - minX) * FONT_SCALE + SIDE_BEARING * 2,
    );

    return {
      character: input.character,
      contours,
      advanceWidth: Math.max(advanceWidth, 150),
    };
  }

  private createOutline(stroke: StrokePoint[]): [number, number][] {
    return getStroke(stroke, {
      size: 18,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
    }).map(([x, y]) => [x, y]);
  }
}

export const glyphProcessingService = new GlyphProcessingService();
