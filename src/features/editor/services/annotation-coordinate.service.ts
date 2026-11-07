import type { AnnotationPosition } from "../domain/annotation.types";

export interface PdfRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportGeometry {
  width: number;
  height: number;
  transform: number[];
}

/**
 * Converts an annotation rectangle from normalized,
 * top-left viewport coordinates into PDF user space.
 */
export function annotationToPdfRect(
  position: AnnotationPosition,
  viewport: ViewportGeometry,
): PdfRectangle {
  const [a, b, c, d, e, f] = viewport.transform;

  const viewportX = (position.x / 100) * viewport.width;
  const viewportY = (position.y / 100) * viewport.height;

  const viewportWidth = (position.width / 100) * viewport.width;
  const viewportHeight = (position.height / 100) * viewport.height;

  // Invert the PDF.js viewport transformation.
  const determinant = a * d - b * c;

  if (Math.abs(determinant) < Number.EPSILON) {
    throw new Error("Invalid PDF viewport transformation.");
  }

  function inverseTransform(x: number, y: number) {
    const translatedX = x - e;
    const translatedY = y - f;

    return {
      x: (d * translatedX - c * translatedY) / determinant,
      y: (-b * translatedX + a * translatedY) / determinant,
    };
  }

  const corners = [
    inverseTransform(viewportX, viewportY),
    inverseTransform(viewportX + viewportWidth, viewportY),
    inverseTransform(viewportX, viewportY + viewportHeight),
    inverseTransform(
      viewportX + viewportWidth,
      viewportY + viewportHeight,
    ),
  ];

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}