"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, PenLine, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

import { SignaturePad } from "../SignaturePad";
import type { SignatureAsset } from "@/features/assets/domain/signature.types";
import { signatureService } from "@/features/assets/services";

interface SignatureDialogProps {
  open: boolean;
  portalRoot: HTMLElement | null;
  initialValue?: string | null;
  onSave: (value: string) => void;
  onClose: () => void;
}

type DialogMode = "saved" | "draw";

export function SignatureDialog({
  open,
  portalRoot,
  initialValue,
  onSave,
  onClose,
}: SignatureDialogProps) {
  const [mode, setMode] = useState<DialogMode>(initialValue ? "draw" : "saved");
  const [signatures, setSignatures] = useState<SignatureAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await signatureService.getAll();
      setSignatures(result);
    } catch {
      setError("Unable to load saved signatures.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setMode(initialValue ? "draw" : "saved");
    setSelectedId(null);
    void loadSignatures();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, initialValue, loadSignatures, onClose]);

  async function handleUseSavedSignature() {
    if (!selectedId) return;

    const signature = signatures.find((item) => item.id === selectedId);

    if (!signature) return;

    try {
      setSaving(true);
      setError(null);

      const value = await signatureToDataUrl(signature);
      onSave(value);
    } catch {
      setError("Unable to use this signature.");
    } finally {
      setSaving(false);
    }
  }

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
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">
              {initialValue ? "Edit signature" : "Add signature"}
            </h3>

            <p className="mt-1 text-xs text-text-muted">
              Choose a saved signature or draw a new one.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setMode("saved")}
            className={`border-b-2 px-3 pb-3 text-sm ${
              mode === "saved"
                ? "border-brand font-medium text-text"
                : "border-transparent text-text-muted"
            }`}
          >
            Saved signatures
          </button>

          <button
            type="button"
            onClick={() => setMode("draw")}
            className={`border-b-2 px-3 pb-3 text-sm ${
              mode === "draw"
                ? "border-brand font-medium text-text"
                : "border-transparent text-text-muted"
            }`}
          >
            Draw signature
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-500">
            {error}
          </p>
        )}

        {mode === "saved" ? (
          <div className="space-y-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-text-muted">
                Loading signatures...
              </p>
            ) : signatures.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <PenLine size={24} className="mx-auto mb-3 text-text-muted" />

                <p className="text-sm font-medium text-text">
                  No saved signatures
                </p>

                <p className="mt-1 text-xs text-text-muted">
                  Draw and save a signature to reuse it here.
                </p>

                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setMode("draw")}
                >
                  Draw signature
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {signatures.map((signature) => (
                  <SignatureOption
                    key={signature.id}
                    signature={signature}
                    selected={selectedId === signature.id}
                    onSelect={() => setSelectedId(signature.id)}
                  />
                ))}
              </div>
            )}

            {signatures.length > 0 && (
              <div className="flex justify-end">
                <Button
                  disabled={!selectedId || saving}
                  isLoading={saving}
                  onClick={() => void handleUseSavedSignature()}
                >
                  <Check size={15} />
                  Use signature
                </Button>
              </div>
            )}
          </div>
        ) : (
          <SignaturePad
            initialValue={initialValue}
            onSave={onSave}
            onCancel={onClose}
          />
        )}
      </div>
    </div>,
    portalRoot,
  );
}

function SignatureOption({
  signature,
  selected,
  onSelect,
}: {
  signature: SignatureAsset;
  selected: boolean;
  onSelect: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (signature.png) {
      const url = URL.createObjectURL(signature.png);
      setPreview(url);

      return () => URL.revokeObjectURL(url);
    }

    if (signature.svg) {
      setPreview(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(signature.svg)}`,
      );
    }
  }, [signature.png, signature.svg]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`overflow-hidden rounded-lg border text-left transition-colors ${
        selected
          ? "border-brand ring-2 ring-brand/20"
          : "border-border hover:border-text-muted"
      }`}
    >
      <div className="flex h-24 items-center justify-center bg-white p-3">
        {preview && (
          <img
            src={preview}
            alt={`${signature.name} preview`}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span className="truncate text-xs font-medium text-text">
          {signature.name}
        </span>

        {selected && <Check size={14} className="shrink-0 text-brand" />}
      </div>
    </button>
  );
}

async function signatureToDataUrl(signature: SignatureAsset): Promise<string> {
  if (signature.png) {
    return blobToDataUrl(signature.png);
  }

  if (!signature.svg) {
    throw new Error("Signature has no usable image.");
  }

  const svgBlob = new Blob([signature.svg], {
    type: "image/svg+xml",
  });

  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to load SVG signature."));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 360;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read signature image."));
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}