"use client";

import { X } from "lucide-react";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";
import type { Annotation, AnnotationUpdate } from "../domain/annotation.types";
import { AnnotationProperties } from "./properties-panel/AnnotationProperties";
import { DocumentProperties } from "./properties-panel/DocumentProperties";
import { headerHeight } from "../utils/editor-constants";

interface PropertiesPanelProps {
  document: Document;
  orderedPages: DocumentPage[];
  selectedPage: number;
  activePage: DocumentPage | undefined;
  workingPdf: StoredDocumentAsset;
  selectedAnnotation: Annotation | undefined;
  onClose: () => void;
  onAnnotationUpdate: (update: AnnotationUpdate) => void;
  onPositionChange: (key: keyof Annotation["position"], value: number) => void;
}

export function PropertiesPanel({
  document,
  orderedPages,
  selectedPage,
  activePage,
  workingPdf,
  selectedAnnotation,
  onClose,
  onAnnotationUpdate,
  onPositionChange,
}: PropertiesPanelProps) {
  return (
    <>
      <div
        aria-label="Close properties panel"
        onClick={onClose}
        className="absolute inset-0 z-16 bg-black/30 backdrop-blur-[2px] md:hidden"
      />
      <aside
        aria-label="Properties panel"
        className="absolute inset-y-0 right-0 z-20 flex w-[min(20rem,calc(100%-1rem))] flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right duration-200 md:relative md:z-1 md:w-64 md:shrink-0 md:shadow-none md:animate-none"
      >
        <PanelHeader
          selectedAnnotation={selectedAnnotation}
          onClose={onClose}
        />

        <div className="space-y-5 overflow-y-auto p-4">
          {selectedAnnotation ? (
            <AnnotationProperties
              annotation={selectedAnnotation}
              onUpdate={onAnnotationUpdate}
              onPositionChange={onPositionChange}
            />
          ) : (
            <>
              <DocumentProperties
                document={document}
                orderedPages={orderedPages}
                selectedPage={selectedPage}
                activePage={activePage}
                workingPdf={workingPdf}
              />
              <div className="border-t border-border" />
              <section className="space-y-4">
                <h3 className="text-sm font-medium">Annotation</h3>
                <p className="text-xs leading-5 text-text-muted">
                  Select an annotation on the document to edit its properties.
                </p>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function PanelHeader({
  selectedAnnotation,
  onClose,
}: {
  selectedAnnotation: Annotation | undefined;
  onClose: () => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-between border-b border-border px-4"
      style={{ height: headerHeight }}
    >
      <div className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Properties
        </h2>
        <p className="mt-0.5 truncate text-[11px] text-text-muted">
          {selectedAnnotation
            ? `${selectedAnnotation.type} annotation`
            : "Document settings"}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close properties panel"
        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-text md:hidden"
      >
        <X size={16} />
      </button>
    </div>
  );
}
