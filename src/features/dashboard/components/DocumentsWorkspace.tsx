"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, FolderOpen, Search, UploadCloud } from "lucide-react";

import { useDocuments, type WorkspaceDocument } from "../hooks/useDocuments";

type SortKey = "recent" | "name";

function documentHref(doc: WorkspaceDocument) {
  return `/editor/${doc.id}`;
}

function formatEdited(timestamp: number) {
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

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

  return "just now";
}

export function DocumentsWorkspace() {
  const { documents, loading, error, reload } = useDocuments();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const visibleDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return documents
      .filter((doc) => doc.name.toLowerCase().includes(needle))
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : b.updatedAt - a.updatedAt,
      );
  }, [documents, query, sort]);

  const hasDocuments = documents.length > 0;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Documents
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Everything you've uploaded. Saved on this device.
          </p>
        </div>

        <Link
          href="/dashboard/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <UploadCloud size={16} />
          Upload PDF
        </Link>
      </header>

      {hasDocuments && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-base text-text outline-none transition-colors placeholder:text-text-muted focus:border-brand sm:text-sm"
            />
          </div>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort documents"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-base text-text outline-none focus:border-brand sm:text-sm"
          >
            <option value="recent">Recently edited</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      )}

      {loading ? (
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading documents"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <li
              key={index}
              className="h-24 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </ul>
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
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-muted">
            <FolderOpen size={24} />
          </div>
          <p className="text-sm font-semibold text-text">No documents yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">
            Upload a PDF or image and it will appear here, ready to fill in and
            sign.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover"
          >
            <UploadCloud size={16} />
            Upload your first PDF
          </Link>
        </div>
      ) : visibleDocuments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">
            No documents match "{query}"
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 text-xs font-medium text-brand hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDocuments.map((doc) => (
            <li key={doc.id}>
              <Link
                href={documentHref(doc)}
                className="group flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/50 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted transition-colors group-hover:text-brand">
                  <FileText size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    {doc.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"} ·
                    Edited {formatEdited(doc.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
