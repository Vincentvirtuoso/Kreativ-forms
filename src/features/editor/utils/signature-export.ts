import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getOutlineBounds,
  getStrokeOutline,
  outlineToPath,
  padBounds,
  sanitizeColor,
  unionBounds,
  type Bounds,
  type Outline,
  type SignatureStroke,
} from "./signature-geometry";

/** Breathing room around the ink, in logical units. */
const EXPORT_PADDING = 16;
/** Output pixels per logical unit. */
const EXPORT_SCALE = 3;
/** Safety cap so one huge signature can't blow up the canvas. */
const MAX_EXPORT_SIDE = 4096;

export interface SignatureDrawing {
  png: string;
  svg?: string;
}

/** An existing signature image being edited, placed inside the logical canvas. */
export interface BaseLayer {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the visible ink actually is, so export can crop to it. */
  bounds: Bounds | null;
}

/** One stroke's filled shape plus its ink color, ready for SVG output. */
export interface ColoredOutline {
  outline: Outline;
  color: string;
}

/**
 * Fit an existing signature image inside the canvas, preserving its aspect
 * ratio. Exports are tightly cropped, so they are no longer 10:3 and must not
 * be stretched back into that shape.
 */
export function createBaseLayer(image: HTMLImageElement): BaseLayer {
  const naturalWidth = image.naturalWidth || CANVAS_WIDTH;
  const naturalHeight = image.naturalHeight || CANVAS_HEIGHT;

  const scale = Math.min(
    (CANVAS_WIDTH * 0.9) / naturalWidth,
    (CANVAS_HEIGHT * 0.9) / naturalHeight,
  );

  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  const layer: BaseLayer = {
    image,
    x: (CANVAS_WIDTH - width) / 2,
    y: (CANVAS_HEIGHT - height) / 2,
    width,
    height,
    bounds: null,
  };

  layer.bounds = measureInkBounds(layer);

  return layer;
}

function measureInkBounds(layer: BaseLayer): Bounds | null {
  const fallback: Bounds = {
    minX: layer.x,
    minY: layer.y,
    maxX: layer.x + layer.width,
    maxY: layer.y + layer.height,
  };

  try {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return fallback;

    context.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);

    const { data } = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    let minX = CANVAS_WIDTH;
    let minY = CANVAS_HEIGHT;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        if (data[(y * CANVAS_WIDTH + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) return null;

    return { minX, minY, maxX: maxX + 1, maxY: maxY + 1 };
  } catch {
    return fallback;
  }
}

/**
 * Paint a signature onto any 2D context. Used for the live pad and for the
 * export, so what you see is what you save.
 */
export function paintSignature(
  context: CanvasRenderingContext2D,
  strokes: SignatureStroke[],
  baseLayer: BaseLayer | null,
  activeStroke: SignatureStroke | null = null,
) {
  if (baseLayer) {
    context.drawImage(
      baseLayer.image,
      baseLayer.x,
      baseLayer.y,
      baseLayer.width,
      baseLayer.height,
    );
  }

  for (const stroke of strokes) {
    const path = outlineToPath(
      getStrokeOutline(stroke, stroke !== activeStroke),
    );

    if (!path) continue;

    context.fillStyle = sanitizeColor(stroke.color);
    context.fill(new Path2D(path));
  }
}

export function buildSignatureSvg(
  items: ColoredOutline[],
  bounds: Bounds,
): string {
  const width = round(bounds.maxX - bounds.minX);
  const height = round(bounds.maxY - bounds.minY);

  const paths = items
    .map(({ outline, color }) => ({
      d: outlineToPath(outline),
      color: sanitizeColor(color),
    }))
    .filter(({ d }) => d)
    .map(({ d, color }) => `<path fill="${color}" d="${d}"/>`)
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    `<g transform="translate(${round(-bounds.minX)} ${round(-bounds.minY)})">${paths}</g>` +
    `</svg>`
  );
}

/**
 * Export the signature cropped to its ink, at high resolution, on a
 * transparent background. The SVG is resolution independent; it is skipped when
 * editing an existing bitmap because there are no vectors for the old part.
 */
export function exportSignature(
  strokes: SignatureStroke[],
  baseLayer: BaseLayer | null,
): SignatureDrawing | null {
  const items: ColoredOutline[] = strokes.map((stroke) => ({
    outline: getStrokeOutline(stroke, true),
    color: stroke.color,
  }));

  const inkBounds = unionBounds(
    getOutlineBounds(items.map((item) => item.outline)),
    baseLayer?.bounds ?? null,
  );

  if (!inkBounds) return null;

  const bounds = padBounds(inkBounds, EXPORT_PADDING);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const scale = Math.min(
    EXPORT_SCALE,
    MAX_EXPORT_SIDE / Math.max(width, height),
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.scale(scale, scale);
  context.translate(-bounds.minX, -bounds.minY);

  paintSignature(context, strokes, baseLayer);

  return {
    png: canvas.toDataURL("image/png"),
    svg: baseLayer ? undefined : buildSignatureSvg(items, bounds),
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
