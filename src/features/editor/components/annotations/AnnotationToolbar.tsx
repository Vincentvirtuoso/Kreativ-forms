"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  PenLine,
  SlidersHorizontal,
  Trash2,
  Type,
} from "lucide-react";

import type { Annotation } from "../../domain/annotation.types";
import {
  TYPE_OPTIONS,
  type AnnotationType,
} from "../../utils/annotation-overlay.constants";
import { AnnotationStyleBar } from "./AnnotationStyleBar";
import { Button } from "@splenddev/kreativ-ui";
import { useAnnotationStore } from "../../stores/useAnnotationStore";

const TYPE_ICONS: Record<AnnotationType, typeof Type> = {
  text: Type,
  date: CalendarDays,
  checkbox: CheckSquare,
  signature: PenLine,
};

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
  onStyleChange?: (changes: Partial<Annotation["style"]>) => void;
  onDelete: () => void;
  onSign: () => void;
  onDone: () => void;
}) {
  const [showStyle, setShowStyle] = useState(false);

  const beginHistoryGroup = useAnnotationStore(
    (state) => state.beginHistoryGroup,
  );

  const endHistoryGroup = useAnnotationStore((state) => state.endHistoryGroup);

  return (
    <div
      role="toolbar"
      aria-label="Annotation tools"
      className="
        pointer-events-none fixed inset-x-0 bottom-0 z-15
        flex flex-col items-center gap-2
        px-3 pb-[max(1rem,env(safe-area-inset-bottom))]
      "
    >
      {/* Expanded style controls */}
      {onStyleChange && showStyle && (
        <div
          id="annotation-style-panel"
          className="
            pointer-events-auto w-fit md:max-w-160 max-w-[calc(100vw-1.5rem)]
            overflow-x-auto
            rounded-xl border border-border
            bg-background/95 shadow-2xl backdrop-blur-xl
            animate-in fade-in slide-in-from-bottom-2 duration-150
          "
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={13} className="text-text-muted" />
              <span className="text-xs font-semibold text-text">
                Appearance
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                endHistoryGroup();
                setShowStyle(false);
              }}
              aria-label="Close style controls"
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
            >
              <ChevronDown size={15} />
            </button>
          </div>

          <div className="p-2">
            <AnnotationStyleBar
              annotation={annotation}
              onChange={onStyleChange}
            />
          </div>
        </div>
      )}

      {/* Main toolbar */}
      <div
        className="
          pointer-events-auto flex max-w-full items-center gap-1
          overflow-x-auto overscroll-x-contain
          rounded-xl border border-border
          bg-background/95 p-1.5
          shadow-[0_8px_40px_rgba(0,0,0,0.14)]
          backdrop-blur-xl
        "
      >
        {/* Annotation types */}
        {canChangeType && (
          <>
            <div
              role="group"
              aria-label="Annotation type"
              className="flex shrink-0 items-center gap-0.5 rounded-lg bg-surface-raised p-1"
            >
              {TYPE_OPTIONS.map((option) => {
                const active = annotation.type === option.type;
                const Icon = TYPE_ICONS[option.type];

                return (
                  <Button
                    key={option.type}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={active}
                    title={option.label}
                    onClick={() => onChangeType(option.type)}
                    size="sm"
                    variant="soft"
                    color={active ? "brand" : "neutral"}
                    iconOnly
                  >
                    <Icon size={15} strokeWidth={1.8} />
                  </Button>
                );
              })}
            </div>

            <div className="mx-1.5 h-6 w-px shrink-0 bg-border" />
          </>
        )}

        {/* Style */}
        {onStyleChange && (
          <Button
            type="button"
            size="sm"
            color={showStyle ? "brand" : "neutral"}
            variant="soft"
            aria-expanded={showStyle}
            aria-controls="annotation-style-panel"
            onClick={() => {
              if (showStyle) {
                endHistoryGroup();
                setShowStyle(false);
              } else {
                beginHistoryGroup();
                setShowStyle(true);
              }
            }}
          >
            <SlidersHorizontal size={15} strokeWidth={1.8} />
            <span>Style</span>
          </Button>
        )}

        {/* Signature */}
        {annotation.type === "signature" && (
          <button
            type="button"
            onClick={onSign}
            className="
              flex h-9 shrink-0 items-center gap-2 rounded-lg
              px-2.5 text-xs font-medium text-text-muted
              transition-colors hover:bg-surface-raised hover:text-text
            "
          >
            <PenLine size={15} strokeWidth={1.8} />
            <span>{annotation.value ? "Redo" : "Sign"}</span>
          </button>
        )}

        {/* Delete */}
        {canDelete && (
          <>
            <div className="mx-1 h-6 w-px shrink-0 bg-border" />

            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete annotation"
              title="Delete annotation"
              className="
                flex h-9 w-9 shrink-0 items-center justify-center
                rounded-lg text-text-muted transition-colors
                hover:bg-red-500/10 hover:text-red-500
              "
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </button>
          </>
        )}

        {/* Done */}
        <Button
          type="button"
          onClick={() => {
            if (showStyle) {
              endHistoryGroup();
              setShowStyle(false);
            }

            onDone();
          }}
          size="sm"
        >
          <Check size={15} strokeWidth={2} />
          Done
        </Button>
      </div>
    </div>
  );
}
