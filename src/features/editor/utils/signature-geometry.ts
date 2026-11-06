import { getStroke } from "perfect-freehand";

/** Logical drawing space. Strokes are stored in these units, never in pixels. */
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 480;

export interface SignaturePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface SignatureStroke {
  points: SignaturePoint[];
  /** Ink color as #rrggbb, fixed when the stroke starts. */
  color: string;
  /** Pen width in logical units, fixed when the stroke starts. */
  size: number;
  /** True when pressure came from a real pen rather than a mouse or finger. */
  hasPressure: boolean;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Closed polygon describing the filled shape of one stroke. */
export type Outline = number[][];

export interface PenSettings {
  color: string;
  size: number;
}

export const MIN_PEN_SIZE = 4;
export const MAX_PEN_SIZE = 20;

export const DEFAULT_PEN: PenSettings = { color: "#111827", size: 7 };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Colors end up in SVG attributes, so anything unexpected falls back to the default. */
export function sanitizeColor(color: string): string {
  return HEX_COLOR.test(color) ? color : DEFAULT_PEN.color;
}

const STROKE_OPTIONS = {
  thinning: 0.55,
  smoothing: 0.6,
  streamline: 0.45,
} as const;

const outlineCache = new WeakMap<
  SignatureStroke,
  { length: number; complete: boolean; outline: Outline }
>();

/**
 * Variable-width outline for a stroke. Cached per stroke so redrawing finished
 * strokes while another one is being drawn stays cheap.
 */
export function getStrokeOutline(
  stroke: SignatureStroke,
  complete: boolean,
): Outline {
  const cached = outlineCache.get(stroke);

  if (
    cached &&
    cached.length === stroke.points.length &&
    cached.complete === complete
  ) {
    return cached.outline;
  }

  const outline = getStroke(stroke.points, {
    ...STROKE_OPTIONS,
    size: stroke.size,
    simulatePressure: !stroke.hasPressure,
    last: complete,
  });

  outlineCache.set(stroke, {
    length: stroke.points.length,
    complete,
    outline,
  });

  return outline;
}

const mid = (a: number, b: number) => (a + b) / 2;
const fmt = (n: number) => n.toFixed(2);

/**
 * SVG path data for an outline. The same string feeds `new Path2D(d)` on the
 * canvas and `<path d>` in the SVG export, so both always match.
 */
export function outlineToPath(outline: Outline): string {
  if (outline.length < 4) return "";

  let a = outline[0];
  let b = outline[1];
  const c = outline[2];

  let d = `M${fmt(a[0])},${fmt(a[1])} Q${fmt(b[0])},${fmt(b[1])} ${fmt(
    mid(b[0], c[0]),
  )},${fmt(mid(b[1], c[1]))} T`;

  for (let i = 2; i < outline.length - 1; i++) {
    a = outline[i];
    b = outline[i + 1];
    d += `${fmt(mid(a[0], b[0]))},${fmt(mid(a[1], b[1]))} `;
  }

  return `${d}Z`;
}

export function getOutlineBounds(outlines: Outline[]): Bounds | null {
  let bounds: Bounds | null = null;

  for (const outline of outlines) {
    for (const [x, y] of outline) {
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

export function unionBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a) return b;
  if (!b) return a;

  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function padBounds(bounds: Bounds, amount: number): Bounds {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  };
}
