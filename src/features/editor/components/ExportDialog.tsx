"use client";

import { useMemo, useState } from "react";
import { Download, LoaderCircle, FileText } from "lucide-react";
import {
  Button,
  Checkbox,
  FormField,
  Input,
} from "@splenddev/kreativ-ui/components";

import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";

import type { DocumentPage } from "@/features/documents/domain/document.types";
import { ExportOptions } from "@/features/documents/services/pdf-export.service";
import { RadioGroup } from "@/components/ui/radio-group";

type ExportMode = "all" | "current" | "selected";

interface ExportDialogProps {
  open: boolean;
  documentName: string;
  pages: DocumentPage[];
  currentPageId: string;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportDialog({
  open,
  documentName,
  pages,
  currentPageId,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [exportMode, setExportMode] = useState<ExportMode>("all");
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [filename, setFilename] = useState(documentName);
  const [validateRequired, setValidateRequired] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const orderedPages = useMemo(
    () => [...pages].sort((a, b) => a.order - b.order),
    [pages],
  );

  const selectedPageCount =
    exportMode === "all"
      ? orderedPages.length
      : exportMode === "current"
        ? 1
        : selectedPageIds.length;

  function togglePageSelection(pageId: string) {
    setSelectedPageIds((current) =>
      current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId],
    );
  }

  async function handleExport() {
    if (isExporting) return;

    const trimmedFilename = filename.trim();

    if (!trimmedFilename) {
      setExportError("Enter a filename for your PDF.");
      return;
    }

    if (exportMode === "selected" && !selectedPageIds.length) {
      setExportError("Select at least one page to export.");
      return;
    }

    if (exportMode === "current" && !currentPageId) {
      setExportError("No current page is available.");
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      const pageIds =
        exportMode === "all"
          ? undefined
          : exportMode === "current"
            ? [currentPageId]
            : orderedPages
                .filter((page) => selectedPageIds.includes(page.id))
                .map((page) => page.id);

      await onExport({
        filename: trimmedFilename,
        validateRequired,
        pageIds,
      });

      onClose();
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Failed to export PDF.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isExporting}
      title="Export PDF"
      description="Configure your PDF export before downloading."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="sm"
            disabled={isExporting}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isExporting || selectedPageCount === 0}
            onClick={handleExport}
          >
            {isExporting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}

            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 px-2">
        {/* Filename */}
        <FormField>
          <FormField.Label>Filename</FormField.Label>
          <FormField.Control>
            <Input
              startIcon={<FileText size={16} />}
              inputClassName="pl-2"
              id="export-filename"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="Enter filename"
              disabled={isExporting}
              size="sm"
            />
          </FormField.Control>
          <FormField.Description className="text-xs text-text-muted">
            The exported document will be saved as a PDF.
          </FormField.Description>
        </FormField>

        {/* Page selection */}
        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium">Pages to export</p>
            <p className="mt-1 text-xs text-text-muted">
              Choose which pages to include in your PDF.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                ["all", "All pages", `${orderedPages.length} pages`],
                ["current", "Current page", "Currently viewing"],
                ["selected", "Selected pages", "Choose pages"],
              ] as const
            ).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                disabled={isExporting}
                aria-pressed={exportMode === value}
                onClick={() => {
                  setExportMode(value);
                  setExportError(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                  exportMode === value
                    ? "border-foreground bg-surface-muted"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-text-muted">{description}</span>
              </button>
            ))}
          </div>

          {exportMode === "selected" && (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-border p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium">Select pages</span>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() =>
                    setSelectedPageIds(
                      selectedPageIds.length === orderedPages.length
                        ? []
                        : orderedPages.map((page) => page.id),
                    )
                  }
                  className="text-xs text-text-muted hover:text-text"
                >
                  {selectedPageIds.length === orderedPages.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {orderedPages.map((page, index) => (
                  <Checkbox
                    key={page.id}
                    label={`Page ${index + 1}`}
                    checked={selectedPageIds.includes(page.id)}
                    disabled={isExporting}
                    onChange={() => togglePageSelection(page.id)}
                    size="xs"
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Required field validation */}
        <section className="rounded-lg border border-border p-3">
          <Checkbox
            label={
              <span className="block text-sm font-medium">
                Validate required fields
              </span>
            }
            description={
              <span className="block text-xs leading-relaxed text-text-muted">
                Prevent export when required fields on the selected pages are
                incomplete.
              </span>
            }
            checked={validateRequired}
            disabled={isExporting}
            onChange={(event) => setValidateRequired(event.target.checked)}
            size="xs"
          />
        </section>

        {/* Export summary */}
        <div className="flex items-center justify-between rounded-lg bg-surface-muted p-3">
          <div>
            <p className="text-sm font-medium">Export summary</p>

            <p className="mt-1 text-xs text-text-muted">
              {selectedPageCount} {selectedPageCount === 1 ? "page" : "pages"} ·
              PDF
            </p>
          </div>

          <span className="text-xs text-text-muted">
            {validateRequired ? "Validation enabled" : "Validation disabled"}
          </span>
        </div>

        {exportError && (
          <p role="alert" className="text-xs text-red-500">
            {exportError}
          </p>
        )}
      </div>
    </Modal>
  );
}
