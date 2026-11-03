"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  X,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import { Button } from "@splenddev/kreativ-ui/components";

import { Alert } from "@/components/ui/alert";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RadioGroup } from "@/components/ui/radio-group";

import {
  DocumentImportService,
  isDocumentImportError,
} from "@/features/documents/import";

import type {
  ImportProgress,
  ImageImportMode,
  PreparedImport,
  PreparedDocumentDraft,
} from "@/features/documents/import";
import { DocumentPageManager } from "./DocumentPageManager";

const importService = new DocumentImportService();

const IMAGE_OPTIONS = [
  {
    value: "separate",
    label: "Separate documents",
    description: "Create an individual document for each image.",
  },
  {
    value: "combine",
    label: "Combine into one PDF",
    description: "Place all selected images into a single document.",
  },
] as const;

function isImageFile(file: File): boolean {
  return (
    ["image/png", "image/jpeg"].includes(file.type) ||
    /\.(png|jpe?g)$/i.test(file.name)
  );
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocumentImportForm() {
  const router = useRouter();

  const abortControllerRef = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [imageMode, setImageMode] = useState<ImageImportMode>("separate");

  const [preparedImport, setPreparedImport] = useState<PreparedImport | null>(
    null,
  );

  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
    {},
  );

  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isBusy = isPreparing || isSaving;

  const imageCount = useMemo(() => files.filter(isImageFile).length, [files]);

  const hasMultipleImages = imageCount > 1;
  const isReviewing = preparedImport !== null;

  // Generate temporary URLs for prepared page thumbnails.
  useEffect(() => {
    if (!preparedImport) {
      setThumbnailUrls({});
      return;
    }

    const urls: Record<string, string> = {};

    for (const item of preparedImport.documents) {
      for (const asset of item.assets) {
        if (asset.type === "thumbnail") {
          urls[asset.id] = URL.createObjectURL(asset.blob);
        }
      }
    }

    setThumbnailUrls(urls);

    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, [preparedImport]);

  // Cancel unfinished preparation when the component unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleFiles(selectedFiles: File[]) {
    if (isBusy) return;

    setFiles(selectedFiles);
    setPreparedImport(null);
    setProgress(null);
    setError(null);
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  function updateDocumentName(index: number, name: string) {
    setPreparedImport((current) => {
      if (!current) return current;

      return {
        ...current,
        documents: current.documents.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                document: {
                  ...item.document,
                  name,
                },
              }
            : item,
        ),
      };
    });
  }

  function updatePreparedDocument(
    documentId: string,
    updatedDraft: PreparedDocumentDraft,
  ) {
    setPreparedImport((current) => {
      if (!current) return current;

      return {
        ...current,
        documents: current.documents.map((item) =>
          item.document.id === documentId ? updatedDraft : item,
        ),
      };
    });
  }

  async function handlePrepare() {
    if (!files.length || isBusy) return;

    setError(null);
    setProgress(null);
    setIsPreparing(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await importService.prepare({
        files,
        options: {
          persistence: "session",
          imageMode,
        },
        callbacks: {
          signal: controller.signal,
          onProgress: setProgress,
        },
      });

      setPreparedImport(result);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          isDocumentImportError(err)
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unable to prepare your documents.",
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsPreparing(false);
    }
  }

  function handleCancelPreparation() {
    abortControllerRef.current?.abort();
  }

  async function handleSave() {
    if (!preparedImport || isBusy) return;

    const invalidDocument = preparedImport.documents.find(
      (item) => !item.document.name.trim(),
    );

    if (invalidDocument) {
      setError("Every document must have a name.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const result = await importService.commit(preparedImport, {
        onProgress: setProgress,
      });

      if (result.documentIds.length) {
        router.push(`/editor/${result.documentIds[0]}`);
      }
    } catch (err) {
      setError(
        isDocumentImportError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to save your documents.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (isBusy) return;

    setPreparedImport(null);
    setProgress(null);
    setError(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Documents</span>
          <span>/</span>
          <span className="text-text">{isReviewing ? "Review" : "Import"}</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {isReviewing ? "Prepare your documents" : "Import documents"}
        </h1>

        <p className="text-sm text-text-muted">
          {isReviewing
            ? "Review your documents before saving them."
            : "Upload PDF files or images to get started."}
        </p>
      </div>

      {error && (
        <Alert
          variant="error"
          title="Something went wrong"
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {!isReviewing ? (
        <>
          <section className="space-y-3">
            <FileDropzone
              accept="application/pdf,image/png,image/jpeg"
              multiple
              disabled={isBusy}
              onFiles={handleFiles}
              title="Drop your files here"
              hint="or click to browse · PDF, PNG and JPG · 25 MB maximum per file"
            />

            {files.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text">
                      Selected files
                    </p>
                    <p className="text-xs text-text-muted">
                      {files.length} file{files.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setFiles([])}
                    className="text-xs font-medium text-text-muted transition-colors hover:text-text disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </div>

                <div className="divide-y divide-border">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                        {isImageFile(file) ? (
                          <ImageIcon className="h-4 w-4 text-text-muted" />
                        ) : (
                          <FileText className="h-4 w-4 text-text-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">
                          {file.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => removeFile(index)}
                        aria-label={`Remove ${file.name}`}
                        className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-text disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {hasMultipleImages && (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-medium text-text">
                  Image import options
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  You selected {imageCount} images. Choose how to organize them.
                </p>
              </div>

              <RadioGroup
                name="image-import-mode"
                value={imageMode}
                onChange={setImageMode}
                options={IMAGE_OPTIONS}
                disabled={isBusy}
              />
            </section>
          )}

          {progress && (
            <section className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                {isPreparing && (
                  <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
                )}

                <p className="text-sm font-medium text-text">
                  {progress.message || "Preparing documents..."}
                </p>
              </div>

              <ProgressBar
                value={progress.percentage}
                label={progress.currentFile}
              />

              {progress.currentFileIndex && progress.totalFiles && (
                <p className="text-xs text-text-muted">
                  File {progress.currentFileIndex} of {progress.totalFiles}
                </p>
              )}
            </section>
          )}

          <div className="flex items-center justify-end gap-3">
            {isPreparing && (
              <button
                type="button"
                onClick={handleCancelPreparation}
                className="text-sm font-medium text-text-muted hover:text-text"
              >
                Cancel
              </button>
            )}

            <Button
              type="button"
              color="neutral"
              disabled={!files.length || isBusy}
              onClick={handlePrepare}
            >
              {isPreparing ? "Preparing..." : "Continue"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>

              <div>
                <p className="text-sm font-medium text-text">
                  Documents prepared
                </p>
                <p className="text-xs text-text-muted">
                  {preparedImport.documents.length} document
                  {preparedImport.documents.length === 1 ? "" : "s"} ready to
                  save
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          <div className="space-y-4">
            {preparedImport.documents.map((item, index) => (
              <section
                key={item.document.id}
                className="overflow-hidden rounded-xl border border-border"
              >
                <div className="space-y-3 border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`document-name-${item.document.id}`}
                      className="text-sm font-medium text-text"
                    >
                      Document name
                    </label>

                    <span className="text-xs text-text-muted">
                      {item.pages.length} pages
                    </span>
                  </div>

                  <input
                    id={`document-name-${item.document.id}`}
                    value={item.document.name}
                    maxLength={200}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateDocumentName(index, event.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-brand"
                    placeholder="Enter document name"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-muted">PAGES</p>

                    <span className="text-xs text-text-muted">
                      {item.pages.length} pages
                    </span>
                  </div>

                  <DocumentPageManager
                    draft={item}
                    thumbnailUrls={thumbnailUrls}
                    disabled={isSaving}
                    onChange={(updatedDraft) =>
                      updatePreparedDocument(item.document.id, updatedDraft)
                    }
                  />
                </div>{" "}
              </section>
            ))}
          </div>

          {isSaving && progress && (
            <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-text">
                {progress.message}
              </p>

              <ProgressBar value={progress.percentage} />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-text-muted">
              You can edit pages in the editor later.
            </p>

            <Button
              type="button"
              color="neutral"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Saving..." : "Save and continue"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
