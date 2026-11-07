"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDocumentRepositories } from "@/features/documents/document-repository.factory";
import type {
  Document,
  PageId
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";

import { PdfDocumentViewer } from "./PdfDocumentViewer";
import { EditorHeader } from "./EditorHeader";
import { PagesPanel } from "./PagesPanel";
import { PropertiesPanel } from "./PropertiesPanel";

import { AnnotationService } from "../services/annotation.service";
import { createAnnotation } from "../services/annotation.factory";
import { useAnnotationPersistence } from "../hooks/useAnnotationPersistence";
import { useAnnotationStore } from "../stores/useAnnotationStore";

import type {
  Annotation,
  AnnotationPosition,
  AnnotationType,
  AnnotationUpdate,
} from "../domain/annotation.types";
import { DocumentPersistenceService } from "@/features/documents/services/document-persistence.service";
import { useDocumentSaveGuard } from "../hooks/useDocumentSaveGuard";
import { PreviewDialog } from "./PreviewDialog";
import { PdfExportService } from "@/features/documents/services/pdf-export.service";
import { DocumentLoaderService } from "@/features/documents/services/document-loader.service";
import { getHandwritingProfileRepository } from "@/features/handwriting/repositories/handwriting-repository.factory";
import { downloadPdf } from "@/features/documents/utils/pdf-download.util";

type HistoryDirection = "undo" | "redo";

const DEFAULT_SIZE: Record<AnnotationType, { width: number; height: number }> =
  {
    text: { width: 30, height: 12 },
    date: { width: 25, height: 12 },
    checkbox: { width: 12, height: 12 },
    signature: { width: 35, height: 12 },
  };

const MOBILE_QUERY = "(max-width: 1023px)";

function isMobileViewport() {
  return (
    typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
}

interface EditorWorkspaceProps {
  document: Document;
  pages: DocumentPage[];
  workingPdf: StoredDocumentAsset;
  assets: StoredDocumentAsset[];
  onRegisterNavigationGuard?: (guard: () => Promise<boolean>) => void;
}

export function EditorWorkspace({
  document,
  pages,
  workingPdf,
  assets,
  onRegisterNavigationGuard,
}: EditorWorkspaceProps) {
  const [selectedPage, setSelectedPage] = useState(1);
  const [showPages, setShowPages] = useState(true);
  const [creatingAnnotation, setCreatingAnnotation] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
    {},
  );
  const [documentSaveFailed, setDocumentSaveFailed] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [annotationsLoading, setAnnotationsLoading] = useState(true);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);
  const canUndo = useAnnotationStore((state) => state.canUndo);
  const canRedo = useAnnotationStore((state) => state.canRedo);

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

  const repositories = useMemo(
    () => getDocumentRepositories(document.persistence),
    [document.persistence],
  );

  const annotationService = useMemo(
    () =>
      new AnnotationService(repositories.annotations, repositories.documents),
    [repositories],
  );

  const documentPersistence = useMemo(
    () => new DocumentPersistenceService(repositories),
    [repositories],
  );

  const pdfExportService = useMemo(() => {
    const loader = new DocumentLoaderService(
      repositories.documents,
      repositories.assets,
      repositories.pages,
    );

    return new PdfExportService(
      loader,
      repositories.annotations,
      getHandwritingProfileRepository(),
    );
  }, [repositories]);

  const { autosave, saveStatus } = useAnnotationPersistence(
    annotationService,
    document.id,
  );

  const hasUnsavedChanges = autosave.hasPending() || documentSaveFailed;

  const { confirmNavigation } = useDocumentSaveGuard({
    hasUnsavedChanges,
    save: async () => {
      const success = await handleSave();

      if (!success) {
        throw new Error("Unable to save document.");
      }
    },
  });

  useEffect(() => {
    onRegisterNavigationGuard?.(confirmNavigation);

    return () => {
      onRegisterNavigationGuard?.(async () => false);
    };
  }, [confirmNavigation, onRegisterNavigationGuard]);

  useEffect(() => {
    if (isMobileViewport()) {
      setShowPages(false);
      setShowProperties(false);
    }
  }, []);

  function persistAnnotationUpdate(id: string, update: AnnotationUpdate) {
    setAnnotationError(null);
    autosave.schedule(id, update);
  }

  async function persistAnnotationSnapshot(
    from: Annotation[],
    to: Annotation[],
  ) {
    const previous = new Map(from.map((item) => [item.id, item]));
    const next = new Map(to.map((item) => [item.id, item]));

    // Delete annotations that no longer exist.
    for (const annotation of from) {
      if (!next.has(annotation.id)) {
        await annotationService.delete(annotation.id);
      }
    }

    // Create new annotations and restore changed annotations.
    for (const annotation of to) {
      const existing = previous.get(annotation.id);

      if (!existing) {
        await annotationService.create(annotation);
        continue;
      }

      if (JSON.stringify(existing) !== JSON.stringify(annotation)) {
        await annotationService.replace(annotation);
      }
    }
  }

  const handleHistory = useCallback(
    async (direction: HistoryDirection) => {
      if (annotationsLoading || historyBusy) return;

      const store = useAnnotationStore.getState();

      if (direction === "undo" ? !store.canUndo : !store.canRedo) {
        return;
      }

      setHistoryBusy(true);
      setAnnotationError(null);

      try {
        await autosave.flushAll();

        const before = useAnnotationStore.getState().annotations;

        if (direction === "undo") {
          undo();
        } else {
          redo();
        }

        const after = useAnnotationStore.getState().annotations;

        try {
          await persistAnnotationSnapshot(before, after);
        } catch (error) {
          // Restore the in-memory history position if persistence fails.
          if (direction === "undo") {
            redo();
          } else {
            undo();
          }

          // Best-effort rollback in IndexedDB.
          try {
            await persistAnnotationSnapshot(after, before);
          } catch (rollbackError) {
            console.error("History rollback failed:", rollbackError);
          }

          throw error;
        }
      } catch (error) {
        console.error("Undo/Redo failed:", error);

        setAnnotationError(
          "Unable to restore annotation changes. Please try again.",
        );
      } finally {
        setHistoryBusy(false);
      }
    },
    [annotationsLoading, historyBusy, autosave, undo, redo],
  );

  const handleUndo = useCallback(() => {
    void handleHistory("undo");
  }, [handleHistory]);

  const handleRedo = useCallback(() => {
    void handleHistory("redo");
  }, [handleHistory]);

  function handleAnnotationUpdate(update: AnnotationUpdate) {
    if (!selectedAnnotation || selectedAnnotation.type !== update.type) {
      return;
    }

    updateAnnotation(selectedAnnotation.id, update);
    persistAnnotationUpdate(selectedAnnotation.id, update);
  }

  function handlePositionChange(key: keyof AnnotationPosition, value: number) {
    if (!selectedAnnotation || !Number.isFinite(value)) return;

    const position = {
      ...selectedAnnotation.position,
      [key]: value,
    };

    const update: AnnotationUpdate = {
      type: selectedAnnotation.type,
      changes: { position },
    } as AnnotationUpdate;

    handleAnnotationUpdate(update);
  }

  async function handleExport(pageIds?: PageId[]): Promise<void> {
  if (annotationsLoading || exporting) {
    throw new Error("Please wait until annotations are ready.");
  }

  setExporting(true);
  setAnnotationError(null);

  try {
    await autosave.flushAll();

    const result = await pdfExportService.export(document.id, {
      pageIds,
    });

    downloadPdf(result.blob, result.filename);

    // Only mark the document completed when exporting the entire document.
    if (!pageIds) {
      await repositories.documents.update(document.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("PDF export failed:", error);
    throw error;
  } finally {
    setExporting(false);
  }
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

  const activePage = orderedPages[selectedPage - 1];

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      if (event.repeat || annotationsLoading || historyBusy || previewing) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (key === "y") {
        event.preventDefault();
        handleRedo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [annotationsLoading, historyBusy, previewing, handleUndo, handleRedo]);

  function handleSelectPage(page: number) {
    setSelectedPage(page);
    selectAnnotation(null);

    if (isMobileViewport()) {
      setShowPages(false);
    }
  }

  function buildAnnotation(
    type: AnnotationType,
    pageId: string,
    position: AnnotationPosition,
    overrides?: {
      required?: boolean;
      style?: Annotation["style"];
    },
  ): Annotation {
    const base = {
      documentId: document.id,
      pageId,
      position,
      style: overrides?.style ?? {},
      required: overrides?.required ?? false,
    };

    switch (type) {
      case "text":
        return createAnnotation<"text">({
          ...base,
          type: "text",
          value: "",
          placeholder: "Enter text",
          multiline: false,
        });

      case "date":
        return createAnnotation<"date">({
          ...base,
          type: "date",
          value: "",
          placeholder: "Select date",
          format: "YYYY-MM-DD",
        });

      case "checkbox":
        return createAnnotation<"checkbox">({
          ...base,
          type: "checkbox",
          checked: false,
        });

      case "signature":
        return createAnnotation<"signature">({
          ...base,
          type: "signature",
          value: null,
        });
    }
  }

  async function handleCreateAnnotation(
    type: AnnotationType,
    at?: AnnotationPosition,
  ): Promise<string | undefined> {
    if (!activePage || creatingAnnotation || annotationsLoading) {
      return;
    }

    setCreatingAnnotation(true);
    setAnnotationError(null);

    const size = DEFAULT_SIZE[type];

    const position: AnnotationPosition = at ?? {
      ...size,
      x: (100 - size.width) / 2,
      y: 40,
    };

    try {
      const annotation = buildAnnotation(type, activePage.id, position);

      await annotationService.create(annotation);

      addAnnotation(annotation);
      selectAnnotation(annotation.id);

      return annotation.id;
    } catch (error) {
      console.error("Failed to create annotation:", error);

      setAnnotationError("Unable to create annotation. Please try again.");

      return undefined;
    } finally {
      setCreatingAnnotation(false);
    }
  }

  async function handleAnnotationDelete(id: string) {
    if (annotationsLoading) return;

    try {
      await autosave.flush(id);
      await annotationService.delete(id);

      removeAnnotation(id);

      setAnnotationError(null);
    } catch (error) {
      console.error("Failed to delete annotation:", error);

      setAnnotationError("Unable to delete annotation. Please try again.");

      throw error;
    }
  }

  async function handleChangeAnnotationType(
    id: string,
    type: AnnotationType,
  ): Promise<void> {
    const current = useAnnotationStore
      .getState()
      .annotations.find((item) => item.id === id);

    if (!current || current.type === type) return;

    try {
      await autosave.flush(id);

      const base = {
        documentId: current.documentId,
        pageId: current.pageId,
        position: current.position,
        required: current.required,
        style: { ...current.style },
      };

      let replacement: Annotation;

      switch (type) {
        case "text":
          replacement = createAnnotation<"text">({
            ...base,
            type: "text",
            value: "",
            placeholder: "Enter text",
            multiline: false,
          });
          break;

        case "date":
          replacement = createAnnotation<"date">({
            ...base,
            type: "date",
            value: "",
            placeholder: "Select date",
            format: "YYYY-MM-DD",
          });
          break;

        case "checkbox":
          replacement = createAnnotation<"checkbox">({
            ...base,
            type: "checkbox",
            checked: false,
          });
          break;

        case "signature":
          replacement = createAnnotation<"signature">({
            ...base,
            type: "signature",
            value: null,
          });
          break;
      }

      const updatedAnnotation: Annotation = {
        ...replacement,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await annotationService.replace(updatedAnnotation);

      useAnnotationStore.getState().replaceAnnotation(updatedAnnotation);

      setAnnotationError(null);
    } catch (error) {
      console.error("Failed to change annotation type:", error);

      setAnnotationError("Could not change annotation type. Please try again.");

      throw error;
    }
  }

  const handleSave = async (): Promise<boolean> => {
    if (annotationsLoading) return false;

    setDocumentSaveFailed(false);

    try {
      await documentPersistence.save(document.id, () => autosave.flushAll());

      setAnnotationError(null);
      return true;
    } catch (error) {
      console.error("Document save failed:", error);

      setDocumentSaveFailed(true);
      setAnnotationError("Unable to save all document changes. Please retry.");
      return false;
    }
  };

  const editorSaveStatus = documentSaveFailed ? "error" : saveStatus;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-125 flex-col overflow-hidden bg-background text-text">
      <EditorHeader
        documentName={document.name}
        pageCount={orderedPages.length}
        showPages={showPages}
        onTogglePages={() => setShowPages((value) => !value)}
        showProperties={showProperties}
        onToggleProperties={() => setShowProperties((value) => !value)}
        saveStatus={editorSaveStatus}
        onSave={handleSave}
        onRetry={handleSave}
        creatingAnnotation={creatingAnnotation}
        annotationsLoading={annotationsLoading}
        activePageExists={Boolean(activePage)}
        onCreateAnnotation={(type) => void handleCreateAnnotation(type)}
        onPreview={() => setPreviewing(true)}
        canUndo={canUndo && !historyBusy && !annotationsLoading}
        canRedo={canRedo && !historyBusy && !annotationsLoading}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {showPages && (
          <PagesPanel
            pages={orderedPages}
            selectedPage={selectedPage}
            onSelectPage={handleSelectPage}
            thumbnailUrls={thumbnailUrls}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {annotationError && (
            <div
              role="alert"
              className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive"
            >
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
              onPageChange={handleSelectPage}
              onAnnotationDelete={handleAnnotationDelete}
              pageId={activePage.id}
              documentId={document.id}
              onAnnotationUpdate={persistAnnotationUpdate}
              onAnnotationCreate={handleCreateAnnotation}
              onAnnotationChangeType={handleChangeAnnotationType}
            />
          )}
        </main>

        {showProperties && (
          <PropertiesPanel
            document={document}
            orderedPages={orderedPages}
            selectedPage={selectedPage}
            activePage={activePage}
            workingPdf={workingPdf}
            selectedAnnotation={selectedAnnotation}
            onClose={() => setShowProperties(false)}
            onAnnotationUpdate={handleAnnotationUpdate}
            onPositionChange={handlePositionChange}
          />
        )}
      </div>
      {previewing && (
        <PreviewDialog
          documentId={document.id}
          documentName={document.name}
          blob={workingPdf.blob}
          pages={orderedPages}
          initialPage={selectedPage}
          onClose={() => setPreviewing(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
