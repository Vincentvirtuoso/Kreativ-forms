import type { PDFPage } from "pdf-lib";

import type { PdfRectangle } from "../domain/export.types";

export class PdfSignatureService {
  async draw(
    page: PDFPage,
    dataUrl: string,
    rect: PdfRectangle,
    opacity = 1,
  ): Promise<void> {
    const { bytes, mimeType } = this.decodeDataUrl(dataUrl);

    const image =
      mimeType === "image/png"
        ? await page.doc.embedPng(bytes)
        : await page.doc.embedJpg(bytes);

    const dimensions = image.scaleToFit(
      rect.width,
      rect.height,
    );

    page.drawImage(image, {
      x: rect.x + (rect.width - dimensions.width) / 2,
      y: rect.y + (rect.height - dimensions.height) / 2,
      width: dimensions.width,
      height: dimensions.height,
      opacity,
    });
  }

  private decodeDataUrl(dataUrl: string): {
    bytes: Uint8Array;
    mimeType: string;
  } {
    const match = dataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i,
    );

    if (!match) {
      throw new Error("Unsupported signature image format.");
    }

    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return {
      bytes,
      mimeType: match[1].toLowerCase(),
    };
  }
}