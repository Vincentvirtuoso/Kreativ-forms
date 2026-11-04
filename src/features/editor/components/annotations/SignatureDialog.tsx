"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { SignaturePad } from "../SignaturePad";

interface SignatureDialogProps {
  open: boolean;
  portalRoot: HTMLElement | null;
  initialValue?: string | null;
  onSave: (value: string) => void;
  onClose: () => void;
}

export function SignatureDialog({
  open,
  portalRoot,
  initialValue,
  onSave,
  onClose,
}: SignatureDialogProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add signature"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-xl border border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {initialValue ? "Edit signature" : "Add signature"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-2 text-sm text-text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>

        <SignaturePad
          initialValue={initialValue}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>,
    portalRoot,
  );
}
