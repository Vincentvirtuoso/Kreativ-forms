"use client";

import { X } from "lucide-react";

import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";
import { formatBytes } from "@/lib/format-bytes";
import type { Annotation, AnnotationUpdate } from "../domain/annotation.types";
import { headerHeight } from "./editor-constants";
import { Property, PropertyCheckbox, PropertyInput } from "./PropertyFields";

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
      <button
        type="button"
        aria-label="Close properties panel"
        onClick={onClose}
        className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[2px] md:hidden"
      />
      <aside
        aria-label="Properties panel"
        className="absolute inset-y-0 right-0 z-40 flex w-[min(20rem,calc(100%-1rem))] flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right duration-200 md:relative md:z-auto md:w-64 md:shrink-0 md:shadow-none md:animate-none"
      >
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
                <Property label="Pages" value={String(orderedPages.length)} />
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
                    onAnnotationUpdate({
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
                        onAnnotationUpdate({
                          type: "text",
                          changes: { placeholder },
                        })
                      }
                    />

                    <PropertyCheckbox
                      label="Multiline"
                      checked={selectedAnnotation.multiline}
                      onChange={(multiline) =>
                        onAnnotationUpdate({
                          type: "text",
                          changes: { multiline },
                        })
                      }
                    />

                    <PropertyInput
                      label="Font size"
                      type="number"
                      min={1}
                      value={String(selectedAnnotation.style.fontSize ?? 14)}
                      onChange={(value) =>
                        onAnnotationUpdate({
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
                        onAnnotationUpdate({
                          type: "date",
                          changes: { placeholder },
                        })
                      }
                    />

                    <PropertyInput
                      label="Date format"
                      value={selectedAnnotation.format}
                      onChange={(format) =>
                        onAnnotationUpdate({
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
                      onAnnotationUpdate({
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
                      onAnnotationUpdate({
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
                      onAnnotationUpdate({
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
                      onAnnotationUpdate({
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
                          onPositionChange(key, Number(value))
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
    </>
  );
}
