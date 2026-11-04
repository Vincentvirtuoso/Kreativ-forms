"use client";

import { useState } from "react";

import { Button } from "@splenddev/kreativ-ui/components";
import type { Annotation } from "../../domain/annotation.types";
import {
  TYPE_OPTIONS,
  type AnnotationType,
} from "../../utils/annotation-overlay.constants";
import { AnnotationStyleBar } from "./AnnotationStyleBar";

export function AnnotationToolbar({
  annotation,
  canChangeType,
  canDelete,
  onChangeType,
  onStyleChange,
  onDelete,
  onSign,
  onDone,
}: {
  annotation: Annotation;
  canChangeType: boolean;
  canDelete: boolean;
  onChangeType: (type: AnnotationType) => void;
  /** When provided, a "Style" button opens the style controls. */
  onStyleChange?: (changes: Partial<Annotation["style"]>) => void;
  onDelete: () => void;
  onSign: () => void;
  onDone: () => void;
}) {
  const [showStyle, setShowStyle] = useState(false);

  return (
    <div
      role="toolbar"
      aria-label="Annotation tools"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {onStyleChange && showStyle && (
        <div
          id="annotation-style-panel"
          className="pointer-events-auto max-w-full rounded-xl border border-border bg-background shadow-lg"
        >
          <AnnotationStyleBar
            annotation={annotation}
            onChange={onStyleChange}
          />
        </div>
      )}

      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background p-1.5 shadow-lg">
        {canChangeType && (
          <div
            role="group"
            aria-label="Annotation type"
            className="flex items-center gap-1"
          >
            {TYPE_OPTIONS.map((option) => {
              const active = annotation.type === option.type;
              return (
                <Button
                  key={option.type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeType(option.type)}
                  color={active ? "brand" : "neutral"}
                  variant={active ? "solid" : "ghost"}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        )}

        {onStyleChange && (
          <>
            <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />
            <Button
              type="button"
              aria-expanded={showStyle}
              aria-controls="annotation-style-panel"
              onClick={() => setShowStyle((value) => !value)}
              color="neutral"
              variant={showStyle ? "soft" : "ghost"}
            >
              Style
            </Button>
          </>
        )}

        {annotation.type === "signature" && (
          <>
            <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />
            <Button type="button" onClick={onSign} variant="soft">
              {annotation.value ? "Redo" : "Sign"}
            </Button>
          </>
        )}

        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />

        {canDelete && (
          <Button
            type="button"
            onClick={onDelete}
            variant="ghost"
            color="destructive"
          >
            Delete
          </Button>
        )}

        <Button type="button" onClick={onDone} variant="ghost" color="brand">
          Done
        </Button>
      </div>
    </div>
  );
}
