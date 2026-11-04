"use client";

import { useEffect, useMemo, useState } from "react";

import { getDocumentRepositories } from "@/features/documents/document-repository.factory";
import type {
  Document,
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

  const {
    autosave,
    saveStatus,
    // retrySave
  } = useAnnotationPersistence(annotationService, document.id);

  const documentPersistence = useMemo(() => {
    const repositories = getDocumentRepositories(document.persistence);

    return new DocumentPersistenceService(repositories);
  }, [document.persistence]);

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
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-125 flex-col overflow-hidden bg-background text-text">
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
    </div>
  );
}
