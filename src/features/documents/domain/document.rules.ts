import type {
  Document,
  DocumentPage,
  DocumentStatus,
  UpdateDocumentInput,
} from "./document.types";

export const DOCUMENT_NAME_MAX_LENGTH = 200;

export const DOCUMENT_FILE_MAX_SIZE = 25 * 1024 * 1024;

export const DOCUMENT_SCHEMA_VERSION = 1;

export const DOCUMENT_RULES = {
  canEdit: (document: Document) => !document.deletedAt,

  canComplete: (document: Document) =>
    !document.deletedAt && document.status !== "completed",

  canRestore: (document: Document) => Boolean(document.deletedAt),

  canPermanentlyDelete: (document: Document) => Boolean(document.deletedAt),

  canSynchronize: (document: Document) =>
    document.persistence === "local" && document.sync.status !== "conflict",

  canChangePersistence: (document: Document) => !document.deletedAt,
} as const;

/**
 * Document name rules
 */
export function normalizeDocumentName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateDocumentName(name: string): boolean {
  const normalized = normalizeDocumentName(name);

  return normalized.length > 0 && normalized.length <= DOCUMENT_NAME_MAX_LENGTH;
}

/**
 * Document status rules
 */
export function getNextDocumentStatus(
  currentStatus: DocumentStatus,
  nextStatus: DocumentStatus,
): DocumentStatus {
  if (currentStatus === "completed" && nextStatus === "in_progress") {
    return "in_progress";
  }

  return nextStatus;
}

/**
 * Document update rules
 */
export function validateDocumentUpdate(
  document: Document,
  changes: UpdateDocumentInput,
): void {
  if (!DOCUMENT_RULES.canEdit(document)) {
    throw new Error("Cannot modify a deleted document.");
  }

  if (changes.name !== undefined && !validateDocumentName(changes.name)) {
    throw new Error("Document name must be between 1 and 200 characters.");
  }

  if (
    changes.status === "completed" &&
    !DOCUMENT_RULES.canComplete(document) &&
    document.status !== "completed"
  ) {
    throw new Error("This document cannot be completed.");
  }

  if (
    changes.completedAt !== undefined &&
    changes.completedAt !== null &&
    Number.isNaN(Date.parse(changes.completedAt))
  ) {
    throw new Error("Invalid completion date.");
  }
}

/**
 * Page management rules
 */
export function validateDocumentPages(pages: DocumentPage[]): void {
  const pageIds = new Set<string>();
  const pageOrders = new Set<number>();

  for (const page of pages) {
    if (pageIds.has(page.id)) {
      throw new Error(`Duplicate page ID: ${page.id}`);
    }

    if (pageOrders.has(page.order)) {
      throw new Error(`Duplicate page order: ${page.order}`);
    }

    if (page.width <= 0 || page.height <= 0) {
      throw new Error(`Invalid dimensions for page ${page.id}.`);
    }

    pageIds.add(page.id);
    pageOrders.add(page.order);
  }
}

/**
 * File import rules
 */
export function validateDocumentFileSize(size: number): boolean {
  return Number.isFinite(size) && size > 0 && size <= DOCUMENT_FILE_MAX_SIZE;
}

export function validateDocumentMimeType(mimeType: string): boolean {
  return ["application/pdf", "image/png", "image/jpeg"].includes(mimeType);
}
