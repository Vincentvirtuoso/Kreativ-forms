export type StrokePoint = [x: number, y: number, pressure: number];

export interface CapturedGlyph {
  character: string;
  strokes: StrokePoint[][];
}

export type GlyphContour = [number, number][];

export interface ProcessedGlyph {
  character: string;
  contours: GlyphContour[];
  advanceWidth: number;
}

export interface GeneratedHandwritingFont {
  name: string;
  blob: Blob;
  format: "ttf";
}

export const GLYPH_VIEWBOX = {
  width: 1000,
  height: 700,
  baseline: 520,
  xHeight: 340,
  ascender: 120,
  descender: 650,
} as const;