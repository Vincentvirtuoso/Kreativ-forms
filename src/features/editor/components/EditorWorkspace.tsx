"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, RotateCw, PanelRight, PanelLeft, Save } from "lucide-react";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import { PdfDocumentViewer } from "./PdfDocumentViewer";
import { getDocumentRepositories } from "@/features/documents/document-repository.factory";
import { AnnotationService } from "../services/annotation.service";
import { useAnnotationStore } from "../stores/useAnnotationStore";
import { useAnnotationPersistence } from "../hooks/useAnnotationPersistence";
import { cn } from "@/lib/cn";
import { createAnnotation } from "../services/annotation.factory";
import { AnnotationType } from "../domain/annotation.types";

interface EditorWorkspaceProps {
  document: Document;
  pages: DocumentPage[];
  workingPdf: StoredDocumentAsset;
  assets: StoredDocumentAsset[];
}

const headerHeight = "3rem";

export function EditorWorkspace({
  document,
  pages,
  workingPdf,
  assets,
}: EditorWorkspaceProps) {
  const [selectedPage, setSelectedPage] = useState(1);
  const [showPages, setShowPages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingAnnotation, setCreatingAnnotation] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
    {},
  );

 const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const setAnnotations = useAnnotationStore((state) => state.setAnnotations);
  const clearAnnotations = useAnnotationStore(
    (state) => state.clearAnnotations,
  );
  const removeAnnotation = useAnnotationStore(
    (state) => state.removeAnnotation,
  );

  const selectAnnotation = useAnnotationStore(
    (state) => state.selectAnnotation,
  );

  const [annotationsLoading, setAnnotationsLoading] = useState(true);
  const [annotationError, setAnnotationError] = useState<string | null>(null);

  const annotationService = useMemo(() => {
    const repositories = getDocumentRepositories(document.persistence);

    return new AnnotationService(repositories.annotations);
  }, [document.persistence]);

  const { autosave } = useAnnotationPersistence(annotationService);

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    setAnnotationError(null);

    try {
      await autosave.flushAll();
    } catch {
      setAnnotationError(
        "Some annotation changes could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const handleAnnotationDelete = async (id: string) => {
    if (annotationsLoading) return;

    try {
      await autosave.flush(id);
      await annotationService.delete(id);

      removeAnnotation(id);
      selectAnnotation(null);
      setAnnotationError(null);
    } catch (error) {
      console.error("Failed to delete annotation:", error);
      setAnnotationError("Unable to delete annotation. Please try again.");
    }
  };

  useEffect(() => {
    let active = true;

    async function loadAnnotations() {
      clearAnnotations();
      setAnnotationsLoading(true);
      setAnnotationError(null);

      try {
        const result = await annotationService.loadByDocument(document.id);

        if (active) {
          setAnnotations(result);
        }
      } catch (error) {
        if (active) {
          setAnnotationError(
            error instanceof Error
              ? error.message
              : "Unable to load annotations.",
          );
        }
      } finally {
        if (active) {
          setAnnotationsLoading(false);
        }
      }
    }
    void loadAnnotations();

    return () => {
      active = false;
      clearAnnotations();
    };
  }, [document.id, annotationService, setAnnotations, clearAnnotations]);

  const orderedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );

  useEffect(() => {
    const urls: Record<string, string> = {};

    for (const asset of assets) {
      if (asset.type === "thumbnail") {
        urls[asset.id] = URL.createObjectURL(asset.blob);
      }
    }

    setThumbnailUrls(urls);

    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, [assets]);

  useEffect(() => {
    setSelectedPage((current) =>
      Math.min(Math.max(current, 1), Math.max(orderedPages.length, 1)),
    );
  }, [orderedPages.length]);

  const activePage = orderedPages[selectedPage - 1];

  async function handleCreateAnnotation(type: AnnotationType) {
    if (!activePage || creatingAnnotation || annotationsLoading) return;

    setCreatingAnnotation(true);
    setAnnotationError(null);

    const base = {
      documentId: document.id,
      pageId: activePage.id,
      position: {
        x: 10,
        y: 10,
        width: 30,
        height: 6,
      },
      style: {},
      required: false,
    };

    try {
      let annotation;

      switch (type) {
        case "text":
          annotation = createAnnotation({
            ...base,
            type: "text",
            value: "",
            placeholder: "Enter text",
            multiline: false,
          });
          break;

        case "date":
          annotation = createAnnotation({
            ...base,
            type: "date",
            value: "",
            placeholder: "Select date",
            format: "YYYY-MM-DD",
          });
          break;

        case "checkbox":
          annotation = createAnnotation({
            ...base,
            type: "checkbox",
            checked: false,
            position: { ...base.position, width: 5, height: 5 },
          });
          break;

        case "signature":
          annotation = createAnnotation({
            ...base,
            type: "signature",
            value: null,
            position: { ...base.position, width: 35, height: 12 },
          });
          break;
      }

      await annotationService.create(annotation);

      addAnnotation(annotation);
      selectAnnotation(annotation.id);
    } catch (error) {
      console.error("Failed to create annotation:", error);
      setAnnotationError("Unable to create annotation. Please try again.");
    } finally {
      setCreatingAnnotation(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-125 flex-col overflow-hidden bg-background text-text">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPages((value) => !value)}
            aria-label="Toggle page panel"
            className="rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <PanelLeft size={17} />
          </button>

          <div className="flex items-center gap-2">
            <FileText size={16} className="text-text-muted" />
            <span className="max-w-48 truncate text-sm font-medium">
              {document.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-text-muted sm:inline">
            {orderedPages.length} pages
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
          <div className="flex items-center gap-1">
            {(
              [
                ["text", "Text"],
                ["checkbox", "Checkbox"],
                ["date", "Date"],
                ["signature", "Signature"],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                disabled={
                  !activePage || annotationsLoading || creatingAnnotation
                }
                onClick={() => void handleCreateAnnotation(type)}
                className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-surface-raised disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowProperties((value) => !value)}
            aria-label="Toggle properties panel"
            className="rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <PanelRight size={17} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showPages && (
          <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-surface">
            <div
              className={cn("border-b border-border px-3 py-3")}
              style={{ height: headerHeight }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Pages
              </h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {orderedPages.map((page, index) => {
                const isActive = selectedPage === index + 1;
                const thumbnail = page.thumbnailAssetId
                  ? thumbnailUrls[page.thumbnailAssetId]
                  : undefined;

                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setSelectedPage(index + 1)}
                    className={`w-full rounded-lg border p-2 text-left transition-colors ${
                      isActive
                        ? "border-brand bg-brand/5"
                        : "border-border hover:bg-surface-raised"
                    }`}
                  >
                    <div className="flex aspect-3/4 items-center justify-center overflow-hidden rounded bg-surface-sunken">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={`Page ${index + 1}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FileText className="h-8 w-8 text-text-muted" />
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium">
                        Page {index + 1}
                      </span>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {annotationError && (
            <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
              {annotationError}
            </div>
          )}

          {annotationsLoading && (
            <div className="border-b border-border px-4 py-2 text-xs text-text-muted">
              Loading annotations...
            </div>
          )}
          {activePage && (
            <PdfDocumentViewer
              blob={workingPdf.blob}
              pageCount={orderedPages.length}
              pageNumber={selectedPage}
              onPageChange={setSelectedPage}
              onAnnotationDelete={handleAnnotationDelete}
              pageId={activePage.id}
              documentId={document.id}
              onAnnotationUpdate={(id, update) => {
                autosave.schedule(id, update);
              }}
            />
          )}
        </main>

        {showProperties && (
          <aside className="hidden w-64 shrink-0 flex-col border-l border-border bg-surface md:flex">
            <div
              className={cn("border-b border-border px-4 py-3")}
              style={{ height: headerHeight }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Properties
              </h2>
            </div>

            <div className="space-y-5 overflow-y-auto p-4">
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Document</h3>

                <Property label="Name" value={document.name} />
                <Property
                  label="Status"
                  value={document.status.replace("_", " ")}
                />
                <Property label="Pages" value={String(orderedPages.length)} />
                <Property
                  label="File size"
                  value={formatBytes(workingPdf.size)}
                />
              </section>

              <div className="border-t border-border" />

              {activePage && (
                <section className="space-y-3">
                  <h3 className="text-sm font-medium">Selected page</h3>

                  <Property label="Page" value={String(selectedPage)} />
                  <Property
                    label="Width"
                    value={`${Math.round(activePage.width)} pt`}
                  />
                  <Property
                    label="Height"
                    value={`${Math.round(activePage.height)} pt`}
                  />
                  <Property
                    label="Rotation"
                    value={`${activePage.rotation}°`}
                  />

                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2 text-text-muted">
                      <RotateCw size={15} />
                      <span className="text-xs">
                        Page rotation is read-only here.
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="wrap-break-word text-sm capitalize">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
