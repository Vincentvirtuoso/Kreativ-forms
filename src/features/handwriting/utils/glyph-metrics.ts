import type { StrokePoint } from "../domain/handwriting.types";

/** Guide lines on the drawing pad, in glyph units (the viewbox is 700 tall). */
export const GUIDE_LINES = {
  ascender: 120,
  xHeight: 340,
  baseline: 520,
  descender: 650,
} as const;

/** Ink shorter than this share of the expected height counts as too small. */
export const MIN_SIZE_RATIO = 0.6;

interface GlyphTarget {
  /** Where the top and bottom of a well-sized glyph sit. */
  top: number;
  bottom: number;
  /** Finishes "Looks small — …" */
  hint: string;
}

const TALL = {
  top: GUIDE_LINES.ascender,
  bottom: GUIDE_LINES.baseline,
  hint: "reach the ascender line",
};

/**
 * Where each kind of character should sit relative to the guides. Returns
 * null for punctuation, whose size varies too much to judge.
 */
export function getGlyphTarget(character: string): GlyphTarget | null {
  if (/^[A-Z0-9]$/.test(character) || "bdfhkl".includes(character)) {
    return TALL;
  }

  if (character === "t") {
    return {
      top: 260,
      bottom: GUIDE_LINES.baseline,
      hint: "reach above the x-height line",
    };
  }

  if (character === "i") {
    return {
      top: 250,
      bottom: GUIDE_LINES.baseline,
      hint: "reach above the x-height line",
    };
  }

  if (character === "j") {
    return {
      top: 250,
      bottom: GUIDE_LINES.descender,
      hint: "extend down to the descender line",
    };
  }

  if ("gpqy".includes(character)) {
    return {
      top: GUIDE_LINES.xHeight,
      bottom: GUIDE_LINES.descender,
      hint: "extend down to the descender line",
    };
  }

  if (/^[a-z]$/.test(character)) {
    return {
      top: GUIDE_LINES.xHeight,
      bottom: GUIDE_LINES.baseline,
      hint: "reach the x-height line",
    };
  }

  return null;
}

export interface InkBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function getInkBounds(strokes: StrokePoint[][]): InkBounds | null {
  let bounds: InkBounds | null = null;

  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      if (!bounds) {
        bounds = { minX: x, minY: y, maxX: x, maxY: y };
        continue;
      }

      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }

  return bounds;
}

export interface GlyphSizeCheck {
  small: boolean;
  bounds: InkBounds | null;
  /** Share of the expected height that was drawn, 0 to 1 and beyond. */
  ratio: number;
  message: string | null;
}

/** Checks a drawn glyph's height against where its guides say it should be. */
export function checkGlyphSize(
  character: string,
  strokes: StrokePoint[][],
): GlyphSizeCheck {
  const target = getGlyphTarget(character);
  const bounds = getInkBounds(strokes);

  if (!target || !bounds) {
    return { small: false, bounds, ratio: 1, message: null };
  }

  const expected = target.bottom - target.top;
  const ratio = (bounds.maxY - bounds.minY) / expected;
  const small = ratio < MIN_SIZE_RATIO;

  return {
    small,
    bounds,
    ratio,
    message: small ? `Looks small — ${target.hint}` : null,
  };
}
