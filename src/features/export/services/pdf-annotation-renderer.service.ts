import {
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  rgb,
  type PDFPage,
} from "pdf-lib";

import type { Annotation } from "@/features/editor/domain/annotation.types";

import type { PdfRectangle, ViewportGeometry } from "../domain/export.types";

import type { PdfFont } from "./pdf-font.service";
import { PdfSignatureService } from "./pdf-signature.service";

export class PdfAnnotationRendererService {
  private readonly signatureService = new PdfSignatureService();

  async render(
    page: PDFPage,
    annotation: Annotation,
    font: PdfFont,
    viewport: ViewportGeometry,
  ): Promise<void> {
    if (
      (annotation.type === "text" || annotation.type === "date") &&
      !annotation.value.trim()
    ) {
      return;
    }

    if (annotation.type === "signature" && !annotation.value) {
      return;
    }

    const style = annotation.style;
    const opacity = style.opacity ?? 1;

    const x = (annotation.position.x / 100) * viewport.width;
    const y = (annotation.position.y / 100) * viewport.height;
    const width = (annotation.position.width / 100) * viewport.width;
    const height = (annotation.position.height / 100) * viewport.height;

    if (width <= 0 || height <= 0) return;

    const [a, b, c, d, e, f] = viewport.transform;
    const determinant = a * d - b * c;

    if (Math.abs(determinant) < Number.EPSILON) {
      throw new Error("Invalid PDF viewport transformation.");
    }

    const inverse = (px: number, py: number) => {
      const tx = px - e;
      const ty = py - f;

      return {
        x: (d * tx - c * ty) / determinant,
        y: (-b * tx + a * ty) / determinant,
      };
    };

    // CSS positive rotation is clockwise in viewport coordinates.
    const rotation = Number.isFinite(annotation.position.rotation)
      ? annotation.position.rotation
      : 0;
    const angle = (rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const rotatePoint = (px: number, py: number) => {
      const dx = px - centerX;
      const dy = py - centerY;

      return {
        x: centerX + cos * dx - sin * dy,
        y: centerY + sin * dx + cos * dy,
      };
    };

    const inverseRotated = (px: number, py: number) => {
      const point = rotatePoint(px, py);
      return inverse(point.x, point.y);
    };

    const bottomLeft = inverseRotated(x, y + height);
    const bottomRight = inverseRotated(x + width, y + height);
    const topLeft = inverseRotated(x, y);

    const matrixA = (bottomRight.x - bottomLeft.x) / width;
    const matrixB = (bottomRight.y - bottomLeft.y) / width;
    const matrixC = (topLeft.x - bottomLeft.x) / height;
    const matrixD = (topLeft.y - bottomLeft.y) / height;

    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(
        matrixA,
        matrixB,
        matrixC,
        matrixD,
        bottomLeft.x,
        bottomLeft.y,
      ),
    );


    try {
      const rect: PdfRectangle = {
        x: 0,
        y: 0,
        width,
        height,
      };

      const backgroundColor = style.backgroundColor
        ? this.parseColor(style.backgroundColor)
        : null;

      const borderColor = style.borderColor
        ? this.parseColor(style.borderColor)
        : null;

      if (backgroundColor) {
        page.drawRectangle({
          ...rect,
          color: backgroundColor,
          opacity,
        });
      }

      if (borderColor && (style.borderWidth ?? 0) > 0) {
        page.drawRectangle({
          ...rect,
          borderColor,
          borderWidth: style.borderWidth,
          opacity,
        });
      }

      switch (annotation.type) {
        case "text":
        case "date":
          this.drawText(page, annotation.value, rect, font, style, opacity);
          break;

        case "checkbox":
          this.drawCheckbox(page, rect, style, annotation.checked, opacity);
          break;

        case "signature":
          await this.signatureService.draw(
            page,
            annotation.value!,
            rect,
            opacity,
          );
          break;
      }
    } finally {
      page.pushOperators(popGraphicsState());
    }
  }

  private drawText(
    page: PDFPage,
    value: string,
    rect: PdfRectangle,
    font: PdfFont,
    style: Annotation["style"],
    opacity: number,
  ): void {
    const fontSize = Math.max(1, (style.fontSize ?? 16) * 0.75);

    // Editor uses px-1 (4 CSS pixels).
    // PDF export operates at 72 points per inch.
    const padding = 3;

    const maxWidth = Math.max(1, rect.width - padding * 2);
    const lineHeight = fontSize * 1.2;

    const lines = this.wrapText(value, font, fontSize, maxWidth);

    const visibleLines = lines.slice(
      0,
      Math.max(1, Math.floor((rect.height - padding * 2) / lineHeight)),
    );

    const totalHeight = visibleLines.length * lineHeight;
    let currentY = rect.y + (rect.height + totalHeight) / 2 - fontSize;

    for (const line of visibleLines) {
      const textWidth = font.widthOfTextAtSize(line, fontSize);

      let textX = rect.x + padding;

      if (style.textAlign === "center") {
        textX = rect.x + (rect.width - textWidth) / 2;
      } else if (style.textAlign === "right") {
        textX = rect.x + rect.width - textWidth - padding;
      }

      page.drawText(line, {
        x: textX,
        y: currentY,
        size: fontSize,
        font,
        color:
          this.parseColor(style.color ?? "#111827") ??
          rgb(17 / 255, 24 / 255, 39 / 255),
        opacity,
      });

      currentY -= lineHeight;
    }
  }

  private drawCheckbox(
    page: PDFPage,
    rect: PdfRectangle,
    style: Annotation["style"],
    checked: boolean | undefined,
    opacity: number,
  ): void {
    if (!checked) return;

    const inset = Math.min(rect.width, rect.height) * 0.2;

    page.drawLine({
      start: {
        x: inset,
        y: rect.height * 0.48,
      },
      end: {
        x: rect.width * 0.43,
        y: inset,
      },
      thickness: Math.max(1, rect.width * 0.07),
      color:
        this.parseColor(style.color ?? "#111827") ??
        rgb(17 / 255, 24 / 255, 39 / 255),
      opacity,
    });

    page.drawLine({
      start: {
        x: rect.width * 0.43,
        y: inset,
      },
      end: {
        x: rect.width - inset,
        y: rect.height - inset,
      },
      thickness: Math.max(1, rect.width * 0.07),
      color:
        this.parseColor(style.color ?? "#111827") ??
        rgb(17 / 255, 24 / 255, 39 / 255),
      opacity,
    });
  }

  private wrapText(
    value: string,
    font: PdfFont,
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const paragraphs = value.split(/\r?\n/);
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/);
      let line = "";

      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;

        if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }

      lines.push(line);
    }

    return lines;
  }

  private parseColor(value: string): ReturnType<typeof rgb> | null {
    const hex = value.trim().replace(/^#/, "");

    if (!/^[0-9a-f]{6}$/i.test(hex)) {
      return null;
    }

    return rgb(
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    );
  }
}
