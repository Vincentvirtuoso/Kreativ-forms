import type { AnnotationPosition } from "../domain/annotation.types";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type SnapGuides = { x: number[]; y: number[] };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type ResizeOptions = {
  /** Pass ANNOTATION_RULES.minWidth / minHeight so the UI never produces a
   *  size the validator will reject. */
  minWidth: number;
  minHeight: number;
  /** Corner handles only. Scales width and height together. */
  keepAspect?: boolean;
};

/**
 * Resizes from any of the 8 handles. Everything is in percent of the page.
 * The edge opposite the handle stays fixed and the box never leaves the page.
 */

export function resizeFromHandle(
  initial: AnnotationPosition,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  { minWidth, minHeight, keepAspect = false }: ResizeOptions,
): AnnotationPosition {
  const { x, y, width, height } = initial;

  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  // Proportional resizing is only supported by corner handles.
  if (keepAspect && handle.length === 2) {
    const anchorX = west ? x + width : x;
    const anchorY = north ? y + height : y;

    const availableWidth = west ? anchorX : 100 - anchorX;
    const availableHeight = north ? anchorY : 100 - anchorY;

    const maxScale = Math.min(availableWidth / width, availableHeight / height);

    const minScale = Math.max(minWidth / width, minHeight / height);

    // A valid initial position should make this impossible.
    // Still, fail safely if the supplied geometry is invalid.
    if (maxScale < minScale) return initial;

    const widthChange = east ? deltaX : west ? -deltaX : 0;

    const heightChange = south ? deltaY : north ? -deltaY : 0;

    // Average fractional changes to preserve the original aspect ratio.
    const scaleDelta = (widthChange / width + heightChange / height) / 2;

    const scale = clamp(1 + scaleDelta, minScale, maxScale);

    const nextWidth = width * scale;
    const nextHeight = height * scale;

    return {
      x: west ? anchorX - nextWidth : anchorX,
      y: north ? anchorY - nextHeight : anchorY,
      width: nextWidth,
      height: nextHeight,
      rotation: initial.rotation,
    };
  }

  let left = x;
  let top = y;
  let right = x + width;
  let bottom = y + height;

  if (west) {
    left = clamp(x + deltaX, 0, right - minWidth);
  }

  if (east) {
    right = clamp(right + deltaX, left + minWidth, 100);
  }

  if (north) {
    top = clamp(y + deltaY, 0, bottom - minHeight);
  }

  if (south) {
    bottom = clamp(bottom + deltaY, top + minHeight, 100);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    rotation: initial.rotation,
  };
}

/**
 * Snaps a moving box's left / centre / right (and top / middle / bottom) to the
 * page edges, the page centre, and the edges and centres of other boxes.
 * Returns the snapped position plus the guide lines to draw.
 */
export function snapMove(
  position: AnnotationPosition,
  others: AnnotationPosition[],
  threshold = 0.8,
): { position: AnnotationPosition; guides: SnapGuides } {
  const xLines = [0, 50, 100];
  const yLines = [0, 50, 100];

  for (const other of others) {
    xLines.push(other.x, other.x + other.width / 2, other.x + other.width);
    yLines.push(other.y, other.y + other.height / 2, other.y + other.height);
  }

  function snapAxis(start: number, size: number, lines: number[]) {
    const anchors = [0, size / 2, size];

    let bestDelta: number | null = null;

    for (const anchor of anchors) {
      for (const line of lines) {
        const delta = line - (start + anchor);

        if (
          Math.abs(delta) <= threshold &&
          (bestDelta === null || Math.abs(delta) < Math.abs(bestDelta))
        ) {
          bestDelta = delta;
        }
      }
    }

    const snapped = clamp(start + (bestDelta ?? 0), 0, 100 - size);

    const guides =
      bestDelta === null
        ? []
        : [
            ...new Set(
              lines.filter((line) =>
                anchors.some(
                  (anchor) => Math.abs(snapped + anchor - line) < 0.01,
                ),
              ),
            ),
          ];

    return { value: snapped, guides };
  }

  const snappedX = snapAxis(position.x, position.width, xLines);
  const snappedY = snapAxis(position.y, position.height, yLines);

  return {
    position: { ...position, x: snappedX.value, y: snappedY.value },
    guides: { x: snappedX.guides, y: snappedY.guides },
  };
}
