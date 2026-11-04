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

// Sizes are percentages of the page. Keep in sync with DEFAULT_SIZE in
// AnnotationOverlay so header-created and double-tap-created annotations match.
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
}

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

  useEffect(() => {
    if (isMobileViewport()) {
      setShowPages(false);
      setShowProperties(false);
    }
  }, []);

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

  function persistAnnotationUpdate(id: string, update: AnnotationUpdate) {
    const current = useAnnotationStore
      .getState()
      .annotations.find((item) => item.id === id);

    if (!current || current.type !== update.type) return;

    useAnnotationStore.getState().updateAnnotation(id, update);
    autosave.schedule(id, update);
    setAnnotationError(null);
  }

  function handleAnnotationUpdate(update: AnnotationUpdate) {
    if (!selectedAnnotation) return;

    persistAnnotationUpdate(selectedAnnotation.id, update);
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

  function handleSelectPage(page: number) {
    setSelectedPage(page);
    selectAnnotation(null);

    if (isMobileViewport()) setShowPages(false);
  }

  function buildAnnotation(
    type: AnnotationType,
    pageId: string,
    position: AnnotationPosition,
    overrides?: { required?: boolean; style?: Annotation["style"] },
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
        return createAnnotation({
          ...base,
          type: "text",
          value: "",
          placeholder: "Enter text",
          multiline: false,
        });

      case "date":
        return createAnnotation({
          ...base,
          type: "date",
          value: "",
          placeholder: "Select date",
          format: "YYYY-MM-DD",
        });

      case "checkbox":
        return createAnnotation({
          ...base,
          type: "checkbox",
          checked: false,
        });

      case "signature":
        return createAnnotation({
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
    if (!activePage || creatingAnnotation || annotationsLoading) return;

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
    } finally {
      setCreatingAnnotation(false);
    }
  }

  async function handleChangeAnnotationType(id: string, type: AnnotationType) {
    if (annotationsLoading) return;

    const current = useAnnotationStore
      .getState()
      .annotations.find((annotation) => annotation.id === id);

    if (!current || current.type === type) return;

    const resize = current.type === "checkbox" || type === "checkbox";
    const position: AnnotationPosition = resize
      ? {
          ...current.position,
          ...DEFAULT_SIZE[type],
          x: Math.min(current.position.x, 100 - DEFAULT_SIZE[type].width),
          y: Math.min(current.position.y, 100 - DEFAULT_SIZE[type].height),
        }
      : current.position;

    const next = {
      ...buildAnnotation(type, current.pageId, position, {
        required: current.required,
        style: current.style,
      }),
      id: current.id,
    } as Annotation;

    setAnnotationError(null);

    try {
      await autosave.flush(id);
      await annotationService.delete(id);

      try {
        await annotationService.create(next);
      } catch (error) {
        await annotationService.create(current).catch(() => undefined);
        throw error;
      }

      removeAnnotation(id);
      addAnnotation(next);
      selectAnnotation(next.id);
    } catch (error) {
      console.error("Failed to change annotation type:", error);
      setAnnotationError("Unable to change annotation type. Please try again.");
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-125 flex-col overflow-hidden bg-background text-text">
      <EditorHeader
        documentName={document.name}
        pageCount={orderedPages.length}
        showPages={showPages}
        onTogglePages={() => setShowPages((value) => !value)}
        showProperties={showProperties}
        onToggleProperties={() => setShowProperties((value) => !value)}
        saving={saving}
        onSave={handleSave}
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
