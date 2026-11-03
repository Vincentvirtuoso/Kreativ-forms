"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import { getDocumentRepositories } from "@/features/documents/document-repository.factory";
import { DocumentLoaderService } from "@/features/documents/services/document-loader.service";
import type { DocumentWorkspace } from "@/features/documents/services/document-workspace.types";

import { EditorWorkspace } from "@/features/editor/components/EditorWorkspace";

export default function EditorPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();

  const [workspace, setWorkspace] = useState<DocumentWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);

        const repositories = getDocumentRepositories("session");

        const loader = new DocumentLoaderService(
          repositories.documents,
          repositories.assets,
          repositories.pages,
        );

        const result = await loader.load(params.documentId);

        if (active) setWorkspace(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to open document.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDocument();

    return () => {
      active = false;
    };
  }, [params.documentId]);

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-6 w-6 animate-spin text-brand" />
      </section>
    );
  }

  if (error || !workspace) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-destructive">
          {error ?? "Document could not be loaded."}
        </p>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col bg-background text-text"
      data-kui-full-bleed
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          aria-label="Back to dashboard"
          className="rounded-md p-2 hover:bg-surface-raised"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="truncate text-sm font-semibold">
          {workspace.document.name}
        </h1>
      </header>

      <EditorWorkspace
        document={workspace.document}
        pages={workspace.pages}
        workingPdf={workspace.workingPdf}
        assets={workspace.assets}
      />
    </section>
  );
}
