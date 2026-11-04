"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
  type LucideIcon,
} from "lucide-react";
import type { AnnotationType } from "../domain/annotation.types";
import { annotationTools } from "./editor-constants";
import { Button } from "@splenddev/kreativ-ui/components";

interface EditorHeaderProps {
  documentName: string;
  pageCount: number;
  showPages: boolean;
  onTogglePages: () => void;
  showProperties: boolean;
  onToggleProperties: () => void;
  saving: boolean;
  onSave: () => void;
  creatingAnnotation: boolean;
  annotationsLoading: boolean;
  activePageExists: boolean;
  onCreateAnnotation: (type: AnnotationType) => void;
}

export function EditorHeader({
  documentName,
  pageCount,
  showPages,
  onTogglePages,
  showProperties,
  onToggleProperties,
  saving,
  onSave,
  creatingAnnotation,
  annotationsLoading,
  activePageExists,
  onCreateAnnotation,
}: EditorHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-border bg-surface px-3 lg:flex-nowrap">
      <div className="flex h-12 min-w-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          onClick={onTogglePages}
          aria-label={showPages ? "Hide page panel" : "Show page panel"}
          aria-pressed={showPages}
          size="sm"
          iconOnly
          variant="ghost"
          color="neutral"
          className="shrink-0 text-text-muted hover:text-text"
        >
          <PanelToggleIcon
            open={showPages}
            OpenIcon={PanelLeftOpen}
            CloseIcon={PanelLeftClose}
          />
        </Button>

        <div className="flex min-w-0 items-center gap-2">
          <FileText size={16} className="shrink-0 text-text-muted" />
          <span className="max-w-32 truncate text-sm font-medium sm:max-w-48">
            {documentName}
          </span>
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="Add annotation"
        className="order-last -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-1.5 overflow-x-auto border-t border-border px-3 py-2 lg:order-0 lg:mx-0 lg:w-auto lg:border-0 lg:px-0 lg:py-0"
      >
        {annotationTools.map(([type, label, Icon]) => (
          <Button
            key={type}
            size="xs"
            typography="bodySmall"
            type="button"
            disabled={
              !activePageExists || annotationsLoading || creatingAnnotation
            }
            variant="ghost"
            color="neutral"
            className="shrink-0 gap-1.5 rounded-md border border-text-muted/20"
            onClick={() => onCreateAnnotation(type)}
          >
            <Icon size={14} className="text-text-muted" />
            {label}
          </Button>
        ))}
      </div>

      <div className="flex h-12 shrink-0 items-center gap-2">
        <span className="hidden text-xs text-text-muted sm:inline">
          {pageCount} pages
        </span>

        <Button
          type="button"
          size="sm"
          iconOnly
          onClick={onSave}
          disabled={saving}
          isLoading={saving}
          aria-label={saving ? "Saving" : "Save"}
          className="rounded-lg "
        >
          <Save size={14} />
          <span className="hidden sm:inline">
            {saving ? "Saving..." : "Save"}
          </span>
        </Button>

        <Button
          type="button"
          onClick={onToggleProperties}
          aria-label={
            showProperties ? "Hide properties panel" : "Show properties panel"
          }
          aria-pressed={showProperties}
          size="sm"
          iconOnly
          variant="ghost"
          color="neutral"
          className="shrink-0 text-text-muted hover:text-text"
        >
          <PanelToggleIcon
            open={showProperties}
            OpenIcon={PanelRightOpen}
            CloseIcon={PanelRightClose}
          />
        </Button>
      </div>
    </header>
  );
}

function PanelToggleIcon({
  open,
  OpenIcon,
  CloseIcon,
}: {
  open: boolean;
  OpenIcon: LucideIcon;
  CloseIcon: LucideIcon;
}) {
  return (
    <span className="relative flex size-4.25 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={open ? "close" : "open"}
          initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {open ? <CloseIcon size={17} /> : <OpenIcon size={17} />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
