"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, FileX, RefreshCw } from "lucide-react";

import { getDocumentRepositories } from "@/features/documents/document-repository.factory";
import { DocumentLoaderService } from "@/features/documents/services/document-loader.service";
import type { DocumentWorkspace } from "@/features/documents/services/document-workspace.types";

import { EditorWorkspace } from "@/features/editor/components/EditorWorkspace";
import { Button } from "@splenddev/kreativ-ui/components";

const STATE_TRANSITION = { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const };

export default function EditorPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();

  const [workspace, setWorkspace] = useState<DocumentWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigationGuardRef = useRef<(() => Promise<boolean>) | null>(null);

  const registerNavigationGuard = useCallback(
    (guard: (() => Promise<boolean>) | null) => {
      navigationGuardRef.current = guard;

      return () => {
        if (navigationGuardRef.current === guard) {
          navigationGuardRef.current = null;
        }
      };
    },
    [],
  );

  const handleBackToDashboard = useCallback(async () => {
    const guard = navigationGuardRef.current;
    if (guard) {
      const canLeave = await guard();
      if (!canLeave) return;
    }
    router.push("/dashboard");
  }, [router]);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWorkspace(null);

    try {
      const candidates = [
        getDocumentRepositories("local"),
        getDocumentRepositories("session"),
      ];

      let repositories = null;

      for (const candidate of candidates) {
        const existing = await candidate.documents.getById(params.documentId);
        if (existing) {
          repositories = candidate;
          break;
        }
      }

      if (!repositories) throw new Error("Document not found.");

      const loader = new DocumentLoaderService(
        repositories.documents,
        repositories.assets,
        repositories.pages,
      );

      const result = await loader.load(params.documentId);
      setWorkspace(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open document.");
    } finally {
      setLoading(false);
    }
  }, [params.documentId]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    if (!workspace) return;

    const previous = document.title;
    document.title = `${workspace.document.name} — Editor`;

    return () => {
      document.title = previous;
    };
  }, [workspace]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATE_TRANSITION}
        >
          <EditorSkeleton />
        </motion.div>
      ) : error || !workspace ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={STATE_TRANSITION}
        >
          <EditorErrorState
            message={error ?? "Document could not be loaded."}
            onRetry={() => void loadDocument()}
            onBack={() => void handleBackToDashboard()}
          />
        </motion.div>
      ) : (
        <motion.div
          key="editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATE_TRANSITION}
          className="flex flex-col overflow-hidden bg-background text-text"
          data-kui-full-bleed
        >
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
            <Button
              type="button"
              onClick={() => void handleBackToDashboard()}
              aria-label="Back to documents"
              size="sm"
              iconOnly
              variant="ghost"
              color="neutral"
              className="shrink-0 text-text-muted hover:text-text"
            >
              <ArrowLeft size={18} />
            </Button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden text-xs text-text-muted sm:inline">
                Documents
              </span>
              <ChevronRight
                size={14}
                className="hidden shrink-0 text-text-muted/60 sm:inline"
              />
              <h1 className="truncate text-sm font-semibold">
                {workspace.document.name}
              </h1>
            </div>
          </header>

          <EditorWorkspace
            document={workspace.document}
            pages={workspace.pages}
            workingPdf={workspace.workingPdf}
            assets={workspace.assets}
            onRegisterNavigationGuard={registerNavigationGuard}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading document"
      className="flex h-screen flex-col bg-background"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="size-8 animate-pulse rounded-md bg-surface-raised" />
        <div className="h-3 w-40 animate-pulse rounded bg-surface-raised" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-48 shrink-0 space-y-3 border-r border-border p-3 md:block">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-3/4 w-full animate-pulse rounded bg-surface-raised" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-surface-raised" />
            </div>
          ))}
        </aside>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="aspect-3/4 w-full max-w-md animate-pulse rounded-lg bg-surface-raised" />
        </div>

        <aside className="hidden w-64 shrink-0 space-y-4 border-l border-border p-4 lg:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-2 w-16 animate-pulse rounded bg-surface-raised" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-raised" />
            </div>
          ))}
        </aside>
      </div>

      <span className="sr-only">Loading document…</span>
    </div>
  );
}

function EditorErrorState({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <FileX size={22} />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-base font-semibold text-text">
          Couldn&apos;t open this document
        </h1>
        <p className="max-w-sm text-sm text-text-muted">{message}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          onClick={onRetry}
          variant="solid"
          color="brand"
          size="sm"
          leftIcon={<RefreshCw size={16} />}
        >
          Try again
        </Button>
        <Button
          type="button"
          onClick={onBack}
          variant="ghost"
          color="neutral"
          size="sm"
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to documents
        </Button>
      </div>
    </div>
  );
}
