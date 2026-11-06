"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSignature,
  Image as ImageIcon,
  LoaderCircle,
  PenLine,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import type { SignatureAsset } from "@/features/assets/domain/signature.types";
import { signatureService } from "@/features/assets/services/signature.service";
import { SignaturePad } from "@/features/assets/components/SignaturePad";

import { HandwritingLibrary } from "@/features/handwriting/components/HandwritingLibrary";
import { toSafeFilename } from "@/lib/toSafeFilename";
import { Button } from "@splenddev/kreativ-ui/components";

type AssetSection = "signatures" | "handwriting";

export function AssetsView() {
  const router = useRouter();

  const [activeSection, setActiveSection] =
    useState<AssetSection>("signatures");

  const [signatures, setSignatures] = useState<SignatureAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async () => {
    try {
      setError(null);
      const result = await signatureService.getAll();
      setSignatures(result);
    } catch {
      setError("Unable to load saved signatures.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSignatures();
  }, [loadSignatures]);

const handleSaveSignature = async (drawing: { png: string; svg?: string }) => {
  const name = signatureName.trim();

  if (!name) {
    setError("Give your signature a name before saving.");
    return;
  }

  try {
    setError(null);

    await signatureService.createFromDrawing(name, drawing);

    setSignatureName("");
    setIsCreating(false);
    await loadSignatures();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to save signature.");
  }
};

  const handleDeleteSignature = async (id: string) => {
    const confirmed = window.confirm(
      "Delete this saved signature? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setError(null);
      await signatureService.delete(id);

      setSignatures((current) =>
        current.filter((signature) => signature.id !== id),
      );
    } catch {
      setError("Unable to delete this signature.");
    }
  };

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
           signature.id === id
             ? { ...signature, name: trimmedName }
             : signature,
         ),
       );

       setError(null);
     } catch {
       setError("Unable to rename this signature.");
     }
   }

  const openHandwritingProfile = (id: string) => {
    router.push(`/handwriting/${id}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
          <ImageIcon className="size-4" />
          Workspace
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Assets
        </h1>

        <p className="max-w-xl text-sm leading-6 text-text-muted">
          Your reusable signatures and personal handwriting styles, organized in
          one place.
        </p>
      </header>

      <div className="flex gap-6 border-b border-border">
        <AssetTab
          active={activeSection === "signatures"}
          icon={<FileSignature className="size-4" />}
          label="Signatures"
          count={signatures.length}
          onClick={() => setActiveSection("signatures")}
        />

        <AssetTab
          active={activeSection === "handwriting"}
          icon={<PenLine className="size-4" />}
          label="Handwriting"
          onClick={() => setActiveSection("handwriting")}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600"
        >
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {activeSection === "handwriting" ? (
        <HandwritingLibrary onOpenProfile={openHandwritingProfile} />
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text">
                Saved signatures
              </h2>
              <p className="text-sm text-text-muted">
                Reuse your saved signatures when filling documents.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCreating((value) => !value);
                setError(null);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:opacity-90"
            >
              {isCreating ? (
                <X className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {isCreating ? "Cancel" : "Add signature"}
            </button>
          </div>

          {isCreating && (
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-text">
                  Create a signature
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Draw your signature below and give it a recognizable name.
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-text-muted">
                  Signature name
                </label>
                <input
                  value={signatureName}
                  onChange={(event) => setSignatureName(event.target.value)}
                  placeholder="e.g. Primary signature"
                  maxLength={60}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text outline-none focus:border-brand sm:max-w-sm"
                />
              </div>

              <SignaturePad
                onSaveDrawing={handleSaveSignature}
                onCancel={() => setIsCreating(false)}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <LoaderCircle className="size-5 animate-spin text-text-muted" />
              <span className="ml-2 text-sm text-text-muted">
                Loading signatures...
              </span>
            </div>
          ) : signatures.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-surface">
                <FileSignature className="size-5 text-text-muted" />
              </div>

              <h3 className="font-medium text-text">No saved signatures</h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">
                Save a signature once and reuse it across your documents without
                drawing it again.
              </p>

              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
              >
                <Plus className="size-4" />
                Create your first signature
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {signatures.map((signature) => (
                <SignatureAssetCard
                  key={signature.id}
                  signature={signature}
                  onDelete={() => void handleDeleteSignature(signature.id)}
                  onRename={handleRenameSignature}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

interface AssetTabProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}

function AssetTab({ active, icon, label, count, onClick }: AssetTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-12 items-center gap-2 border-b-2 text-sm font-medium transition-colors ${
        active
          ? "border-brand text-text"
          : "border-transparent text-text-muted hover:text-text"
      }`}
    >
      {icon}
      {label}

      {count !== undefined && (
        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
          {count}
        </span>
      )}
    </button>
  );
}

interface SignatureAssetCardProps {
  signature: SignatureAsset;
  onDelete: () => void;
}

function SignatureAssetCard({
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
