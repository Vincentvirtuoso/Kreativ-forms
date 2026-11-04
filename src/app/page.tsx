"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  FolderOpen,
  PenLine,
  UploadCloud,
} from "lucide-react";

import {
  useDocuments,
  type WorkspaceDocument,
} from "@/features/dashboard/hooks/useDocuments";

type DocumentStatus = WorkspaceDocument["status"];

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

const statusStyles: Record<DocumentStatus, string> = {
  draft: "bg-surface-raised text-text-muted",
  in_progress: "bg-brand/10 text-brand",
  completed: "bg-success/10 text-success",
};

const statusLabels: Record<DocumentStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  completed: "Completed",
};

function documentHref(doc: WorkspaceDocument) {
  return `/editor/${doc.id}`;
}

function getGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
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

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export default function HomePage() {
  const { documents, loading, error, reload } = useDocuments();

  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const stats = useMemo(
    () => ({
      total: documents.length,
      inProgress: documents.filter((doc) => doc.status === "in_progress")
        .length,
      completed: documents.filter((doc) => doc.status === "completed").length,
    }),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => activeFilter === "all" || doc.status === activeFilter)
      .slice(0, 6);
  }, [documents, activeFilter]);

  const hasDocuments = documents.length > 0;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-9">
      <header>
        <p className="mb-1 min-h-5 text-sm text-text-muted">
          {now?.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          {now ? getGreeting(now) : "Welcome"}
        </h1>

        <p className="mt-1 text-sm text-text-muted">
          {hasDocuments
            ? "Pick up where you left off."
            : "Manage and complete your documents in one place."}
        </p>
      </header>

      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="mb-4 text-base font-semibold text-text"
        >
          Quick actions
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/new"
            className="group flex items-center gap-4 rounded-xl border border-brand/40 bg-surface p-4 transition-colors hover:border-brand hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-fg">
              <UploadCloud size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">Upload document</p>
              <p className="mt-1 text-xs text-text-muted">
                Import a PDF or image
              </p>
            </div>

            <ArrowUpRight
              size={17}
              className="text-text-muted transition-colors group-hover:text-text"
            />
          </Link>

          <Link
            href="/dashboard/new?type=blank"
            className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/50 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text">
              <FilePlus2 size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">New document</p>
              <p className="mt-1 text-xs text-text-muted">
                Start with a blank document
              </p>
            </div>

            <ArrowUpRight
              size={17}
              className="text-text-muted transition-colors group-hover:text-text"
            />
          </Link>
        </div>
      </section>

      {!loading && !error && hasDocuments && (
        <section aria-labelledby="overview-heading">
          <h2
            id="overview-heading"
            className="mb-4 text-base font-semibold text-text"
          >
            Overview
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Total documents",
                value: stats.total,
                icon: FileText,
              },
              {
                label: "In progress",
                value: stats.inProgress,
                icon: Clock3,
              },
              {
                label: "Completed",
                value: stats.completed,
                icon: CheckCircle2,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5"
              >
                <div>
                  <p className="text-xs text-text-muted sm:text-sm">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-text">
                    {value}
                  </p>
                </div>

                <div className="rounded-lg bg-surface-raised p-3 text-text-muted">
                  <Icon size={20} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="recent-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2
              id="recent-heading"
              className="text-base font-semibold text-text"
            >
              Recent documents
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              {hasDocuments
                ? "Continue working on your documents."
                : "Your recently opened documents will appear here."}
            </p>
          </div>

          {hasDocuments && (
            <Link
              href="/dashboard?tab=uploaded"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-brand"
            >
              View all
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-label="Loading documents"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center"
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
        ) : !hasDocuments ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-raised text-text-muted">
              <FolderOpen size={23} />
            </div>

            <p className="text-sm font-semibold text-text">No documents yet</p>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-muted">
              Once you upload a document, it will appear here so you can quickly
              pick up where you left off.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border p-3">
              <div
                role="group"
                aria-label="Filter documents by status"
                className="flex items-center gap-1"
              >
                {FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={activeFilter === filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeFilter === filter.value
                        ? "bg-surface-raised text-text"
                        : "text-text-muted hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FolderOpen
                  className="mx-auto mb-3 text-text-muted"
                  size={25}
                />

                <p className="text-sm font-medium text-text">
                  No {activeFilter.replace("_", " ")} documents
                </p>

                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className="mt-2 text-xs font-medium text-brand hover:underline"
                >
                  Show all documents
                </button>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border md:hidden">
                  {filteredDocuments.map((doc) => (
                    <li key={doc.id}>
                      <Link
                        href={documentHref(doc)}
                        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-raised/50 focus-visible:bg-surface-raised/50 focus-visible:outline-none"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
                          <FileText size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">
                            {doc.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-text-muted">
                            {doc.pageCount}{" "}
                            {doc.pageCount === 1 ? "page" : "pages"}
                            {" · "}
                            {formatEdited(doc.updatedAt)}
                          </p>
                        </div>

                        <DocumentStatusBadge status={doc.status} />
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-surface-raised/50">
                        <th className="px-5 py-3 text-xs font-medium text-text-muted">
                          Document
                        </th>
                        <th className="px-5 py-3 text-xs font-medium text-text-muted">
                          Last modified
                        </th>
                        <th className="px-5 py-3 text-xs font-medium text-text-muted">
                          Status
                        </th>
                        <th className="w-12 px-5 py-3">
                          <span className="sr-only">Open</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {filteredDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="group transition-colors hover:bg-surface-raised/50"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={documentHref(doc)}
                              className="flex items-center gap-3 focus-visible:outline-none focus-visible:underline"
                            >
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
                                <FileText size={19} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-text">
                                  {doc.name}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {doc.pageCount}{" "}
                                  {doc.pageCount === 1 ? "page" : "pages"}
                                </p>
                              </div>
                            </Link>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm text-text-muted">
                              {formatEdited(doc.updatedAt)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <DocumentStatusBadge status={doc.status} />
                          </td>

                          <td className="px-5 py-4">
                            <ArrowUpRight
                              size={16}
                              className="text-text-muted transition-colors group-hover:text-brand"
                              aria-hidden="true"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="border-t border-border px-4 py-3 sm:px-5">
              <p className="text-xs text-text-muted">
                Showing {filteredDocuments.length} of {documents.length}{" "}
                documents
              </p>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
