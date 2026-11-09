import type { Annotation } from "@/features/editor/domain/annotation.types";
import type { PageId } from "@/features/documents/domain/document.types";

import type { ExportOptions } from "../domain/export.types";
import type { DocumentWorkspace } from "../../documents/services/document-workspace.types";

export class PdfExportValidationService {
  selectPages(
    workspace: DocumentWorkspace,
    options: ExportOptions,
    sourcePageCount: number,
  ): DocumentWorkspace["pages"] {
    if (options.pageIds && options.pageIds.length === 0) {
      throw new Error("Select at least one page to export.");
    }

    let pages: DocumentWorkspace["pages"];

    if (options.pageIds) {
      const uniqueIds = new Set(options.pageIds);

      if (uniqueIds.size !== options.pageIds.length) {
        throw new Error("Duplicate pages were selected.");
      }

      pages = options.pageIds.map((id) => {
        const page = workspace.pages.find((item) => item.id === id);

        if (!page) {
          throw new Error(`Could not find page "${id}".`);
        }

        return page;
      });
    } else {
      pages = [...workspace.pages];
    }

    pages.sort((a, b) => a.order - b.order);

    for (const page of pages) {
      if (
        !Number.isInteger(page.order) ||
        page.order < 0 ||
        page.order >= sourcePageCount
      ) {
        throw new Error(`Invalid PDF page order for page "${page.id}".`);
      }
    }

    return pages;
  }

  validateRequiredAnnotations(annotations: Annotation[]): void {
    const missing = annotations.filter((annotation) => {
      if (!annotation.required) return false;

      switch (annotation.type) {
        case "text":
        case "date":
          return !annotation.value.trim();

        case "signature":
          return !annotation.value;

        case "checkbox":
          return !annotation.checked;
      }
    });

    if (missing.length > 0) {
      throw new Error(
        `${missing.length} required field(s) have not been completed.`,
      );
    }
  }

  getSelectedPageIds(pages: DocumentWorkspace["pages"]): Set<PageId> {
    return new Set(pages.map((page) => page.id));
  }
}
