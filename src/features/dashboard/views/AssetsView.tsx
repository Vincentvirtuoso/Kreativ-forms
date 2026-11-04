"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, Plus, PenLine, Trash2, X, Download } from "lucide-react";
import { Button, FormField, Input } from "@splenddev/kreativ-ui/components";

import type { SignatureAsset } from "@/features/assets/domain/signature.types";
import { signatureService } from "@/features/assets/services";
import { SignaturePad } from "@/features/editor/components/SignaturePad";
import { toSafeFilename } from "@/lib/toSafeFilename";

export function AssetsView() {
  const [signatures, setSignatures] = useState<SignatureAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async () => {
    try {
      setLoading(true);
      const result = await signatureService.getAll();
      setSignatures(result);
      setError(null);
    } catch {
      setError("Unable to load your saved signatures.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSignatures();
  }, [loadSignatures]);

  async function handleSaveSignature(drawing: { png: string; svg?: string }) {
    if (!signatureName.trim()) {
      setError("Enter a name for this signature.");
      return;
    }

    try {
      const signature = await signatureService.createFromDrawing(
        signatureName,
        drawing,
      );

      setSignatures((current) => [signature, ...current]);

      setSignatureName("");
      setCreating(false);
      setError(null);
    } catch {
      setError("Unable to save this signature. Please try again.");
    }
  }

  async function handleDeleteSignature(id: string) {
    try {
      await signatureService.delete(id);

      setSignatures((current) =>
        current.filter((signature) => signature.id !== id),
      );
    } catch {
      setError("Unable to delete this signature.");
    }
  }

  async function handleRenameSignature(id: string, name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Signature name cannot be empty.");
      return;
    }

    try {
      await signatureService.update(id, { name: trimmedName });

      setSignatures((current) =>
        current.map((signature) =>
          signature.id === id ? { ...signature, name: trimmedName } : signature,
        ),
      );

      setError(null);
    } catch {
      setError("Unable to rename this signature.");
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Assets</h1>

          <p className="mt-1 text-sm text-text-muted">
            Manage reusable resources for your documents.
          </p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          Add signature
        </Button>
      </header>

      {creating && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-text">Create signature</h2>

              <p className="mt-1 text-xs text-text-muted">
                Draw your signature and save it for reuse.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setSignatureName("");
              }}
              aria-label="Close signature editor"
              className="text-text-muted hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
          <FormField message={error ?? null}>
            <FormField.Label>Signature name</FormField.Label>
            <FormField.Control>
              <Input
                id="signature-name"
                value={signatureName}
                onChange={(event) => setSignatureName(event.target.value)}
                size="sm"
                className="rounded-lg"
                placeholder="e.g. Primary signature"
                maxLength={80}
              />
            </FormField.Control>
          </FormField>

          <SignaturePad
            onSave={() => {
              setError("Please use the drawing save action.");
            }}
            onSaveDrawing={handleSaveSignature}
            onCancel={() => {
              setCreating(false);
              setSignatureName("");
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-text-muted">
          Loading assets...
        </p>
      ) : signatures.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-surface-raised text-text-muted">
            <Images size={22} />
          </div>

          <h2 className="text-sm font-semibold text-text">
            No saved signatures yet
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-text-muted">
            Create a signature once and reuse it across your documents.
          </p>

          <Button className="mt-5" onClick={() => setCreating(true)}>
            <Plus size={15} />
            Create signature
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {signatures.map((signature) => (
            <SignatureCard
              key={signature.id}
              signature={signature}
              onDelete={handleDeleteSignature}
              onRename={handleRenameSignature}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SignatureCard({
  signature,
  onDelete,
  onRename,
}: {
  signature: SignatureAsset;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(signature.name);

  useEffect(() => {
    if (!signature.png) return;

    const url = URL.createObjectURL(signature.png);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [signature.png]);

  async function saveName() {
    await onRename(signature.id, name);
    setEditingName(false);
  }

  function handleDownload() {
    if (!signature.png) return;

    
    
    
    const mime = signature.png instanceof Blob ? signature.png.type : "";
    const extension = mime === "image/svg+xml" ? "svg" : "png";

    const url = URL.createObjectURL(signature.png);
    const link = document.createElement("a");
    link.href = url;
    link.download = toSafeFilename(signature.name, extension);
    document.body.appendChild(link);
    link.click();
    link.remove();

    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex h-36 items-center justify-center bg-white p-4">
        {preview ? (
          <img
            src={preview}
            alt={`${signature.name} preview`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <PenLine size={24} className="text-gray-400" />
        )}
      </div>

      <div className="space-y-3 border-t border-border p-3">
        {editingName ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand"
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveName();
                if (event.key === "Escape") {
                  setName(signature.name);
                  setEditingName(false);
                }
              }}
            />

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                color="neutral"
                onClick={() => {
                  setName(signature.name);
                  setEditingName(false);
                }}
              >
                Cancel
              </Button>

              <Button size="sm" onClick={() => void saveName()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium text-text">
                {signature.name}
              </h3>

              <p className="mt-1 text-xs uppercase text-text-muted">
                {signature.format}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                onClick={handleDownload}
                size="sm"
                iconOnly
                variant="ghost"
                color="neutral"
                aria-label={`Download ${signature.name}`}
                title="Download"
              >
                <Download size={15} />
              </Button>

              <Button
                type="button"
                onClick={() => setEditingName(true)}
                size="sm"
                iconOnly
                variant="ghost"
                color="neutral"
                aria-label={`Rename ${signature.name}`}
                title="Rename"
              >
                <PenLine size={15} />
              </Button>

              <Button
                type="button"
                onClick={() => onDelete(signature.id)}
                size="sm"
                iconOnly
                variant="ghost"
                color="destructive"
                aria-label={`Delete ${signature.name}`}
                title="Delete"
              >
                <Trash2 size={15} />
              </Button>
            </div>{" "}
          </div>
        )}
      </div>
    </article>
  );
}
