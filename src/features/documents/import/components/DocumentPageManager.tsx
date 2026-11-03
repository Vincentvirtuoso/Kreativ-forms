"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  LoaderCircle,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";

import type { PreparedDocumentDraft } from "@/features/documents/import";
import { DocumentPreparationService } from "@/features/documents/import";

interface DocumentPageManagerProps {
  draft: PreparedDocumentDraft;
  thumbnailUrls: Record<string, string>;
  disabled?: boolean;
  onChange: (draft: PreparedDocumentDraft) => void;
}

const preparationService = new DocumentPreparationService();

export function DocumentPageManager({
  draft,
  thumbnailUrls,
  disabled = false,
  onChange,
}: DocumentPageManagerProps) {
  const [busyPageId, setBusyPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pages = [...draft.pages].sort((a, b) => a.order - b.order);

  const isProcessing = busyPageId !== null;

  async function performAction(
    pageId: string,
    action: () => Promise<PreparedDocumentDraft>,
  ) {
    if (disabled || isProcessing) return;

    setBusyPageId(pageId);
    setError(null);

    try {
      const updatedDraft = await action();
      onChange(updatedDraft);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update this document.",
      );
    } finally {
      setBusyPageId(null);
    }
  }

  async function handleAddPages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (!files.length) return;

    await performAction("adding-pages", () =>
      preparationService.addPages(draft, files),
    );
  }

  function movePage(pageId: string, direction: -1 | 1) {
    const currentIndex = pages.findIndex((page) => page.id === pageId);

    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const reordered = [...pages];

    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];

    void performAction(pageId, () =>
      preparationService.reorderPages(
        draft,
        reordered.map((page) => page.id),
      ),
    );
  }

  function rotatePage(pageId: string) {
    void performAction(pageId, () =>
      preparationService.rotatePage(draft, pageId, 90),
    );
  }

  function removePage(pageId: string) {
    void performAction(pageId, () =>
      preparationService.removePage(draft, pageId),
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-text">Pages ({pages.length})</h3>

          <p className="text-xs text-text-muted">Manage your document pages.</p>
        </div>

        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyPageId === "adding-pages" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add pages
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          hidden
          onChange={handleAddPages}
        />
      </div>

      {/* Errors */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Page grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {pages.map((page, index) => {
          const thumbnailUrl = page.thumbnailAssetId
            ? thumbnailUrls[page.thumbnailAssetId]
            : undefined;

          const isBusy = busyPageId === page.id;

          return (
            <article
              key={page.id}
              className="group overflow-hidden rounded-lg border border-border bg-surface"
            >
              <div className="relative flex aspect-3/4 items-center justify-center overflow-hidden bg-surface-sunken p-2">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={`Page ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <FileText className="h-8 w-8 text-text-muted" />
                )}

                {isBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
                  </div>
                )}

                <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-xs font-medium text-text">
                  {index + 1}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 p-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move page ${index + 1} up`}
                    title="Move up"
                    disabled={disabled || isProcessing || index === 0}
                    onClick={() => movePage(page.id, -1)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label={`Move page ${index + 1} down`}
                    title="Move down"
                    disabled={
                      disabled || isProcessing || index === pages.length - 1
                    }
                    onClick={() => movePage(page.id, 1)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Rotate page ${index + 1}`}
                    title="Rotate 90°"
                    disabled={disabled || isProcessing}
                    onClick={() => rotatePage(page.id)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text disabled:opacity-30"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label={`Remove page ${index + 1}`}
                    title="Remove page"
                    disabled={disabled || isProcessing || pages.length === 1}
                    onClick={() => removePage(page.id)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-text-muted">
        {pages.length} page{pages.length === 1 ? "" : "s"} · Use the arrows to
        reorder pages.
      </p>
    </div>
  );
}
