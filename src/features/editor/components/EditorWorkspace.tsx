"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  RotateCw,
  PanelRight,
  PanelLeft,
  Save,
  PenLine,
} from "lucide-react";

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
import type {
  Annotation,
  AnnotationType,
  AnnotationUpdate,
} from "../domain/annotation.types";

interface EditorWorkspaceProps {
  document: Document;
  pages: DocumentPage[];
  workingPdf: StoredDocumentAsset;
  assets: StoredDocumentAsset[];
}

import { Calendar, CheckSquare, Type } from "lucide-react";

const annotationTools = [
  ["text", "Text", Type],
  ["checkbox", "Checkbox", CheckSquare],
  ["date", "Date", Calendar],
  ["signature", "Signature", PenLine],
] as const;
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
  const selectedAnnotationId = useAnnotationStore(
    (state) => state.selectedAnnotationId,
  );
  const selectedAnnotation = useAnnotationStore((state) =>
    state.annotations.find(
      (annotation) => annotation.id === selectedAnnotationId,
    ),
  );
  const updateAnnotation = useAnnotationStore(
    (state) => state.updateAnnotation,
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

  function handleAnnotationUpdate(update: AnnotationUpdate) {
    if (!selectedAnnotation || selectedAnnotation.type !== update.type) {
      return;
    }

    updateAnnotation(selectedAnnotation.id, update);
    autosave.schedule(selectedAnnotation.id, update);
    setAnnotationError(null);
  }

  function handlePositionChange(
    key: keyof Annotation["position"],
    value: number,
  ) {
    if (!selectedAnnotation || !Number.isFinite(value)) return;

    const position = { ...selectedAnnotation.position };
    const nextValue = Math.max(0, Math.min(100, value));

    if (key === "x") {
      position.x = Math.min(nextValue, 100 - position.width);
    } else if (key === "y") {
      position.y = Math.min(nextValue, 100 - position.height);
    } else if (key === "width") {
      position.width = Math.min(nextValue, 100 - position.x);
    } else {
      position.height = Math.min(nextValue, 100 - position.y);
    }

    handleAnnotationUpdate({
      type: selectedAnnotation.type,
      changes: { position },
    } as AnnotationUpdate);
  }

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
        height: 12,
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
            position: { ...base.position, width: 12, height: 12 },
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
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-border bg-surface px-3 lg:flex-nowrap">
        {/* Left: panel toggle + document name */}
        <div className="flex h-12 min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowPages((value) => !value)}
            aria-label="Toggle page panel"
            aria-pressed={showPages}
            className="shrink-0 rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <PanelLeft size={17} />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <FileText size={16} className="shrink-0 text-text-muted" />
            <span className="max-w-32 truncate text-sm font-medium sm:max-w-48">
              {document.name}
            </span>
          </div>
        </div>

        {/* Annotation tools: own scrollable row on mobile, inline from lg */}
        <div
          role="toolbar"
          aria-label="Add annotation"
          className="order-last -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-1.5 overflow-x-auto border-t border-border px-3 py-2 lg:order-0 lg:mx-0 lg:w-auto lg:border-0 lg:px-0 lg:py-0"
        >
          {annotationTools.map(([type, label, Icon]) => (
            <button
              key={type}
              type="button"
              disabled={!activePage || annotationsLoading || creatingAnnotation}
              onClick={() => void handleCreateAnnotation(type)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-surface-raised disabled:opacity-50"
            >
              <Icon size={14} className="text-text-muted" />
              {label}
            </button>
          ))}
        </div>

        {/* Right: page count, save, properties toggle */}
        <div className="flex h-12 shrink-0 items-center gap-2">
          <span className="hidden text-xs text-text-muted sm:inline">
            {orderedPages.length} pages
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            aria-label={saving ? "Saving" : "Save"}
            className="flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} />
            <span className="hidden sm:inline">
              {saving ? "Saving..." : "Save"}
            </span>
          </button>

          {/* The properties panel is `hidden md:flex`, so the toggle is useless below md */}
          <button
            type="button"
            onClick={() => setShowProperties((value) => !value)}
            aria-label="Toggle properties panel"
            aria-pressed={showProperties}
            className="hidden rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text md:inline-flex"
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
              className="border-b border-border px-4 py-3"
              style={{ height: headerHeight }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Properties
              </h2>
            </div>

            <div className="space-y-5 overflow-y-auto p-4">
              {!selectedAnnotation && (
                <>
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium">Document</h3>

                    <Property label="Name" value={document.name} />
                    <Property
                      label="Status"
                      value={document.status.replace("_", " ")}
                    />
                    <Property
                      label="Pages"
                      value={String(orderedPages.length)}
                    />
                    <Property
                      label="File size"
                      value={formatBytes(workingPdf.size)}
                    />
                  </section>

                  {activePage && (
                    <>
                      <div className="border-t border-border" />

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
                      </section>
                    </>
                  )}

                  <div className="border-t border-border" />
                </>
              )}

              <section className="space-y-4">
                <h3 className="text-sm font-medium">Annotation</h3>
                {!selectedAnnotation ? (
                  <p className="text-xs leading-5 text-text-muted">
                    Select an annotation on the document to edit its properties.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Type</span>
                      <span className="text-xs font-medium capitalize">
                        {selectedAnnotation.type}
                      </span>
                    </div>

                    <PropertyCheckbox
                      label="Required field"
                      checked={selectedAnnotation.required}
                      onChange={(required) => {
                        handleAnnotationUpdate({
                          type: selectedAnnotation.type,
                          changes: { required },
                        } as AnnotationUpdate);
                      }}
                    />

                    {selectedAnnotation.type === "text" && (
                      <>
                        <PropertyInput
                          label="Placeholder"
                          value={selectedAnnotation.placeholder ?? ""}
                          onChange={(placeholder) =>
                            handleAnnotationUpdate({
                              type: "text",
                              changes: { placeholder },
                            })
                          }
                        />

                        <PropertyCheckbox
                          label="Multiline"
                          checked={selectedAnnotation.multiline}
                          onChange={(multiline) =>
                            handleAnnotationUpdate({
                              type: "text",
                              changes: { multiline },
                            })
                          }
                        />

                        <PropertyInput
                          label="Font size"
                          type="number"
                          min={1}
                          value={String(
                            selectedAnnotation.style.fontSize ?? 14,
                          )}
                          onChange={(value) =>
                            handleAnnotationUpdate({
                              type: "text",
                              changes: {
                                style: { fontSize: Math.max(1, Number(value)) },
                              },
                            })
                          }
                        />
                      </>
                    )}

                    {selectedAnnotation.type === "date" && (
                      <>
                        <PropertyInput
                          label="Placeholder"
                          value={selectedAnnotation.placeholder ?? ""}
                          onChange={(placeholder) =>
                            handleAnnotationUpdate({
                              type: "date",
                              changes: { placeholder },
                            })
                          }
                        />

                        <PropertyInput
                          label="Date format"
                          value={selectedAnnotation.format}
                          onChange={(format) =>
                            handleAnnotationUpdate({
                              type: "date",
                              changes: { format },
                            })
                          }
                        />
                      </>
                    )}

                    {selectedAnnotation.type === "checkbox" && (
                      <PropertyCheckbox
                        label="Checked"
                        checked={selectedAnnotation.checked}
                        onChange={(checked) =>
                          handleAnnotationUpdate({
                            type: "checkbox",
                            changes: { checked },
                          })
                        }
                      />
                    )}

                    {selectedAnnotation.type === "signature" && (
                      <PropertyInput
                        label="Signer name"
                        value={selectedAnnotation.signerName ?? ""}
                        onChange={(signerName) =>
                          handleAnnotationUpdate({
                            type: "signature",
                            changes: { signerName },
                          })
                        }
                      />
                    )}

                    <div className="border-t border-border pt-4">
                      <h4 className="mb-3 text-xs font-medium text-text-muted">
                        Appearance
                      </h4>

                      <PropertyInput
                        label="Text color"
                        type="color"
                        value={selectedAnnotation.style.color ?? "#000000"}
                        onChange={(color) =>
                          handleAnnotationUpdate({
                            type: selectedAnnotation.type,
                            changes: { style: { color } },
                          } as AnnotationUpdate)
                        }
                      />

                      <PropertyInput
                        label="Background"
                        type="color"
                        value={
                          selectedAnnotation.style.backgroundColor ?? "#ffffff"
                        }
                        onChange={(backgroundColor) =>
                          handleAnnotationUpdate({
                            type: selectedAnnotation.type,
                            changes: { style: { backgroundColor } },
                          } as AnnotationUpdate)
                        }
                      />
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="mb-3 text-xs font-medium text-text-muted">
                        Position and size
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            ["X", "x"],
                            ["Y", "y"],
                            ["Width", "width"],
                            ["Height", "height"],
                          ] as const
                        ).map(([label, key]) => (
                          <PropertyInput
                            key={key}
                            label={`${label} (%)`}
                            type="number"
                            min={0}
                            max={100}
                            value={String(selectedAnnotation.position[key])}
                            onChange={(value) =>
                              handlePositionChange(key, Number(value))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </section>
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

function PropertyInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>

      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function PropertyCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-xs text-text-muted">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-brand"
      />
    </label>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
