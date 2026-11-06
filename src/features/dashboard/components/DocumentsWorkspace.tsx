"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  LoaderCircle,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { useDocuments, type WorkspaceDocument } from "../hooks/useDocuments";
import { useSettings } from "@/features/settings/providers/settings-provider";
import { Select } from "@splenddev/kreativ-ui";

type SortKey = "recent" | "name";
type StatusFilter = "all" | WorkspaceDocument["status"];
type WorkspaceView = "documents" | "trash";

const statusConfig = {
  draft: {
    label: "Draft",
    className: "bg-surface-raised text-text-muted",
  },
  in_progress: {
    label: "In progress",
    className: "bg-brand/10 text-brand",
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success",
  },
} as const;

function documentHref(doc: WorkspaceDocument) {
  return `/editor/${doc.id}`;
}

function formatEdited(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Recently";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return "Just now";
}

export function DocumentsWorkspace() {
  const {
    documents,
    trash,
    loading,
    error,
    reload,
    moveToTrash,
    restore,
    permanentlyDelete,
  } = useDocuments();

  const { settings, loading: settingsLoading } = useSettings();

  const confirmBeforeDelete =
    settingsLoading || settings.preferences.confirmBeforeDelete;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<WorkspaceView>("documents");

  const [pendingDelete, setPendingDelete] = useState<WorkspaceDocument | null>(
    null,
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: documents.length,
      draft: documents.filter((doc) => doc.status === "draft").length,
      in_progress: documents.filter((doc) => doc.status === "in_progress")
        .length,
      completed: documents.filter((doc) => doc.status === "completed").length,
    }),
    [documents],
  );

  const sortDocuments = (items: WorkspaceDocument[]) => {
    return [...items].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  };

  const visibleDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return sortDocuments(
      documents.filter((doc) => {
        const matchesQuery = doc.name.toLowerCase().includes(needle);
        const matchesStatus = status === "all" || doc.status === status;

        return matchesQuery && matchesStatus;
      }),
    );
  }, [documents, query, sort, status]);

  const visibleTrash = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return sortDocuments(
      trash.filter((doc) => doc.name.toLowerCase().includes(needle)),
    );
  }, [trash, query, sort]);

  const filters: {
    value: StatusFilter;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All documents", count: counts.all },
    { value: "draft", label: "Drafts", count: counts.draft },
    {
      value: "in_progress",
      label: "In progress",
      count: counts.in_progress,
    },
    { value: "completed", label: "Completed", count: counts.completed },
  ];

  async function handleMoveToTrash(doc: WorkspaceDocument) {
    setBusyId(doc.id);
    setActionError(null);

    try {
      await moveToTrash(doc.id);
    } catch {
      setActionError(`Unable to move "${doc.name}" to trash.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(doc: WorkspaceDocument) {
    setBusyId(doc.id);
    setActionError(null);

    try {
      await restore(doc.id);
    } catch {
      setActionError(`Unable to restore "${doc.name}".`);
    } finally {
      setBusyId(null);
    }
  }

  async function executePermanentDelete(doc: WorkspaceDocument) {
    setBusyId(doc.id);
    setActionError(null);

    try {
      await permanentlyDelete(doc.id);
      setPendingDelete(null);
    } catch (error) {
      console.error("Permanent deletion failed:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : `Unable to permanently delete "${doc.name}".`,
      );
    } finally {
      setBusyId(null);
    }
  }

  function requestPermanentDelete(doc: WorkspaceDocument) {
    if (settingsLoading || confirmBeforeDelete) {
      setPendingDelete(doc);
      return;
    }

    void executePermanentDelete(doc);
  }

  useEffect(() => {
    if (!pendingDelete) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyId) {
        setPendingDelete(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingDelete, busyId]);

  const hasDocuments = documents.length > 0;
  const hasTrash = trash.length > 0;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
            <FileText size={14} />
            Document workspace
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {view === "documents" ? "Documents" : "Trash"}
          </h1>

          <p className="text-sm text-text-muted">
            {view === "documents"
              ? "Manage, edit and keep track of your documents."
              : "Restore documents or permanently remove them from this device."}
          </p>
        </div>

        {view === "documents" && (
          <Link
            href="/dashboard/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <UploadCloud size={16} />
            Upload document
          </Link>
        )}
      </header>

      {/* Workspace navigation */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => {
            setView("documents");
            setActionError(null);
          }}
          aria-pressed={view === "documents"}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            view === "documents"
              ? "border-brand text-brand"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <FileText size={15} />
          Documents
          <span className="text-xs tabular-nums opacity-70">
            {documents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setView("trash");
            setActionError(null);
          }}
          aria-pressed={view === "trash"}
          className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            view === "trash"
              ? "border-brand text-brand"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Trash2 size={15} />
          Trash
          <span className="text-xs tabular-nums opacity-70">
            {trash.length}
          </span>
        </button>
      </div>

      {/* Overview */}
      {view === "documents" && !loading && !error && hasDocuments && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <FileText size={15} />
              Total documents
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-text">
              {counts.all}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock3 size={15} />
              In progress
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-text">
              {counts.in_progress}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-border bg-surface p-4 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <CheckCircle2 size={15} />
              Completed
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-text">
              {counts.completed}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {(view === "documents" ? hasDocuments : hasTrash) &&
        !loading &&
        !error && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />

                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    view === "documents"
                      ? "Search documents..."
                      : "Search trash..."
                  }
                  aria-label="Search documents"
                  className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-brand"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="relative shrink-0">
                <ArrowDownUp
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />

                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  aria-label="Sort documents"
                  className="h-10 w-full appearance-none rounded-lg border border-border bg-surface pl-9 pr-8 text-sm text-text outline-none focus:border-brand sm:w-auto"
                >
                  <option value="recent">Recently edited</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
            </div>

            {view === "documents" && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatus(filter.value)}
                    aria-pressed={status === filter.value}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      status === filter.value
                        ? "border-brand/30 bg-brand/10 text-brand"
                        : "border-border bg-surface text-text-muted hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    {filter.label}
                    <span className="tabular-nums opacity-70">
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Action error */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading documents"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <li
              key={index}
              className="h-28 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </ul>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center"
        >
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 text-xs font-medium text-brand hover:underline"
          >
            Try again
          </button>
        </div>
      ) : view === "documents" ? (
        !hasDocuments ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-raised text-text-muted">
              <FolderOpen size={23} />
            </div>

            <h2 className="text-sm font-semibold text-text">
              Your workspace is empty
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-text-muted">
              Upload a PDF or image to get started. You can fill, sign and
              personalize your documents right here.
            </p>

            <Link
              href="/dashboard/new"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover"
            >
              <UploadCloud size={16} />
              Upload your first document
            </Link>
          </div>
        ) : visibleDocuments.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
            <Search size={20} className="mx-auto mb-3 text-text-muted" />
            <p className="text-sm font-medium text-text">
              No matching documents
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Try changing your search or status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
              className="mt-3 text-xs font-medium text-brand hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">
                {status === "all"
                  ? "All documents"
                  : filters.find((filter) => filter.value === status)?.label}
              </h2>
              <span className="text-xs text-text-muted">
                {visibleDocuments.length}{" "}
                {visibleDocuments.length === 1 ? "document" : "documents"}
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDocuments.map((doc) => {
                const badge = statusConfig[doc.status];
                const busy = busyId === doc.id;

                return (
                  <li
                    key={doc.id}
                    className="flex min-h-36 flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
                  >
                    <Link
                      href={documentHref(doc)}
                      className="group flex min-w-0 items-center gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted transition-colors group-hover:text-brand">
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">
                          {doc.name}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {doc.pageCount}{" "}
                          {doc.pageCount === 1 ? "page" : "pages"}
                          <span aria-hidden="true"> · </span>
                          Edited {formatEdited(doc.updatedAt)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </Link>

                    <div className="flex justify-end border-t border-border pt-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleMoveToTrash(doc)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
                      >
                        {busy ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Move to trash
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      ) : !hasTrash ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-raised text-text-muted">
            <Trash2 size={22} />
          </div>
          <h2 className="text-sm font-semibold text-text">Trash is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-text-muted">
            Documents you move to trash will appear here. You can restore them
            or permanently delete them.
          </p>
        </div>
      ) : visibleTrash.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <Search size={20} className="mx-auto mb-3 text-text-muted" />
          <p className="text-sm font-medium text-text">No matching documents</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-xs font-medium text-brand hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              Deleted documents
            </h2>
            <span className="text-xs text-text-muted">
              {visibleTrash.length}{" "}
              {visibleTrash.length === 1 ? "document" : "documents"}
            </span>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTrash.map((doc) => {
              const busy = busyId === doc.id;

              return (
                <li
                  key={doc.id}
                  className="flex min-h-36 flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">
                        {doc.name}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                      </p>
                      <span className="mt-2 inline-flex rounded-md bg-destructive/5 px-2 py-1 text-[10px] font-medium text-destructive">
                        In trash
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRestore(doc)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-surface-raised hover:text-text disabled:opacity-50"
                    >
                      {busy ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Restore
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => executePermanentDelete(doc)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Delete permanently
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Permanent deletion confirmation */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyId) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="permanent-delete-title"
            aria-describedby="permanent-delete-description"
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle size={21} />
            </div>

            <h2
              id="permanent-delete-title"
              className="text-lg font-semibold tracking-tight text-text"
            >
              Permanently delete document?
            </h2>

            <p
              id="permanent-delete-description"
              className="mt-2 text-sm leading-6 text-text-muted"
            >
              <span className="font-medium text-text">
                {pendingDelete.name}
              </span>{" "}
              and its associated pages, annotations and document files will be
              permanently removed from this device. This action cannot be
              undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busyId === pendingDelete.id}
                onClick={() => setPendingDelete(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-surface-raised disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busyId === pendingDelete.id}
                onClick={() => void executePermanentDelete(pendingDelete)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === pendingDelete.id ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
