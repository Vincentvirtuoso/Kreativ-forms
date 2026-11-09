
import type { PageId } from "@/features/documents/domain/document.types";
import type { DocumentWorkspace } from "./document-workspace.types";

import { pdfjsLib } from "@/engines/pdf/pdfjs.client";

import type { ViewportGeometry } from "../domain/export.types";

export class PdfViewportService {
  async getGeometries(
    blob: Blob,
    pages: DocumentWorkspace["pages"],
  ): Promise<Map<PageId, ViewportGeometry>> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(await blob.arrayBuffer()),
    });

    try {
      const document = await loadingTask.promise;
      const geometries = new Map<PageId, ViewportGeometry>();

      for (const metadata of pages) {
        const page = await document.getPage(metadata.order + 1);

        try {
          const viewport = page.getViewport({ scale: 1 });

          geometries.set(metadata.id, {
            width: viewport.width,
            height: viewport.height,
            transform: [...viewport.transform],
            rotation: (((viewport.rotation % 360) + 360) % 360) as
              | 0
              | 90
              | 180
              | 270,
          });
        } finally {
          page.cleanup();
        }
      }

      return geometries;
    } finally {
      await loadingTask.destroy();
    }
  }
}
