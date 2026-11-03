"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  hint?: string;
}

export function FileDropzone({
  accept,
  multiple = true,
  disabled = false,
  onFiles,
  title = "Click to upload or drag and drop",
  hint,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list);
    if (files.length) onFiles(files);
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={title}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (!disabled && e.dataTransfer.items?.length) setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragging
          ? "border-brand bg-brand/5"
          : "border-border hover:border-brand/50 hover:bg-surface-raised"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <UploadCloud className="h-8 w-8 text-text-muted" />
      <p className="text-sm font-medium text-text">
        {isDragging ? "Drop files to import" : title}
      </p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
