"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UploadCloud,
  FilePlus2,
  FileText,
  PenLine,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight,
  FolderOpen,
  Type,
  // Not used in the MVP (see commented-out sections below):
  // Search,
  // Bell,
  // LayoutTemplate,
  // MoreHorizontal,
  // SlidersHorizontal,
  // Sparkles,
  // X,
} from "lucide-react";
import Link from "next/link";

type DocumentStatus = "Draft" | "In progress" | "Completed";

type DocumentItem = {
  id: string | number;
  name: string;
  type: string;
  size: string;
  modified: string;
  status: DocumentStatus;
  color: string;
};

/**
 * TODO: load these from wherever uploads are saved locally
 * (IndexedDB / localStorage). Until then the dashboard shows its empty state.
 *
 * The old mock data is kept below for reference / UI testing.
 */
const documents: DocumentItem[] = [];

// const documents: DocumentItem[] = [
//   {
//     id: 1,
//     name: "Client Service Agreement",
//     type: "PDF document",
//     size: "2.4 MB",
//     modified: "Today, 10:42 AM",
//     status: "In progress",
//     color: "bg-blue-50 text-blue-600",
//   },
//   {
//     id: 2,
//     name: "Tax Registration Form",
//     type: "PDF document",
//     size: "1.8 MB",
//     modified: "Today, 9:15 AM",
//     status: "Completed",
//     color: "bg-emerald-50 text-emerald-600",
//   },
//   {
//     id: 3,
//     name: "Employment Application",
//     type: "PDF document",
//     size: "856 KB",
//     modified: "Yesterday",
//     status: "Draft",
//     color: "bg-amber-50 text-amber-600",
//   },
// ];

// Templates aren't built yet.
// const templates = [
//   {
//     name: "Business Contract",
//     category: "Legal",
//     description: "Professional agreements for businesses.",
//     color: "bg-blue-50",
//     accent: "text-blue-600",
//     icon: FileText,
//   },
//   {
//     name: "Invoice",
//     category: "Finance",
//     description: "Create and manage payment invoices.",
//     color: "bg-amber-50",
//     accent: "text-amber-600",
//     icon: FileText,
//   },
//   {
//     name: "Application Form",
//     category: "General",
//     description: "Collect information with ease.",
//     color: "bg-violet-50",
//     accent: "text-violet-600",
//     icon: FileText,
//   },
// ];

const FILTERS = ["All", "Draft", "In progress", "Completed"] as const;

const statusStyles: Record<DocumentStatus, string> = {
  Draft: "bg-amber-50 text-amber-700",
  "In progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

// TODO: confirm this matches the editor route once it exists.
function documentHref(doc: DocumentItem) {
  return `/dashboard/${doc.id}`;
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const steps = [
  {
    icon: UploadCloud,
    title: "Upload a PDF",
    description: "Import the form or document you need to complete.",
  },
  {
    icon: Type,
    title: "Fill it in",
    description:
      "Double-click or double-tap the page to add text, dates and checkboxes.",
  },
  {
    icon: PenLine,
    title: "Sign and export",
    description: "Add your signature, then download the finished PDF.",
  },
];

export default function DashboardHome() {
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]>("All");

  // Date and greeting depend on the user's clock, so they're set after mount
  // to avoid a server/client hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (doc) => activeFilter === "All" || doc.status === activeFilter,
      ),
    [activeFilter],
  );

  const stats = useMemo(() => {
    const count = (status: DocumentStatus) =>
      documents.filter((doc) => doc.status === status).length;

    return [
      {
        label: "Total documents",
        value: documents.length,
        icon: FileText,
        color: "text-text-muted",
      },
      {
        label: "In progress",
        value: count("In progress"),
        icon: PenLine,
        color: "text-blue-600",
      },
      {
        label: "Completed",
        value: count("Completed"),
        icon: CheckCircle2,
        color: "text-emerald-600",
      },
    ];
  }, []);

  const hasDocuments = documents.length > 0;

  return (
    <section className="min-h-screen">
      <div className="mx-auto max-w-360 space-y-8 sm:space-y-9">
        <header>
          {/* Reserve the height so the layout doesn't jump when the date appears. */}
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
              : "Upload a PDF to get started."}
          </p>

          {/* No backend yet, so there's nothing to search, no notifications and
              no account avatar. Uploads are saved locally.
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-brand"
              />
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-raised"
            >
              <Bell size={18} />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-fg">
              FV
            </div>
          </div>
          */}
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
              className="group flex items-center gap-4 rounded-xl border border-brand/40 bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-fg">
                <UploadCloud size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">Upload PDF</p>
                <p className="mt-1 text-xs text-text-muted">
                  Import an existing document
                </p>
              </div>
              <ArrowUpRight
                size={17}
                className="text-text-muted transition-colors group-hover:text-text"
              />
            </Link>

            <Link
              href="/dashboard/new?type=blank"
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand/50 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text">
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

            {/* Templates aren't available yet.
            <Link
              href="/dashboard?tab=templates"
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand/50 hover:bg-surface-raised"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text">
                <LayoutTemplate size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">
                  Browse templates
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Explore ready-made documents
                </p>
              </div>
              <ArrowUpRight size={17} className="text-text-muted" />
            </Link>
            */}
          </div>
        </section>

        {hasDocuments && (
          <section aria-labelledby="overview-heading">
            <h2
              id="overview-heading"
              className="mb-4 text-base font-semibold text-text"
            >
              Overview
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="flex flex-col-reverse justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:p-5"
                >
                  <div>
                    <p className="text-xs text-text-muted sm:text-sm">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-text sm:mt-2">
                      {value}
                    </p>
                  </div>
                  <div
                    className={`w-fit rounded-lg bg-surface-raised p-2.5 sm:p-3 ${color}`}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="recent-heading">
          <div className="mb-4">
            <h2
              id="recent-heading"
              className="text-base font-semibold text-text"
            >
              Recent documents
            </h2>
            {/* No "View all" page yet.
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-text hover:text-brand"
            >
              View all <ChevronRight size={16} />
            </button>
            */}
          </div>

          {!hasDocuments ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-muted">
                <FolderOpen size={24} />
              </div>
              <p className="text-sm font-semibold text-text">
                No documents yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">
                Documents you upload are saved on this device and will show up
                here.
              </p>
              <Link
                href="/dashboard/new"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <UploadCloud size={16} />
                Upload your first PDF
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border p-3">
                <div
                  role="group"
                  aria-label="Filter by status"
                  className="flex items-center gap-1 overflow-x-auto"
                >
                  {FILTERS.map((filter) => (
                    <button
                      type="button"
                      key={filter}
                      aria-pressed={activeFilter === filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeFilter === filter
                          ? "bg-surface-raised text-text"
                          : "text-text-muted hover:bg-surface-raised hover:text-text"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* The status filters above cover this for now.
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-raised"
                >
                  <SlidersHorizontal size={14} />
                  Filter
                </button>
                */}
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <FolderOpen
                    className="mx-auto mb-3 text-text-muted"
                    size={26}
                  />
                  <p className="text-sm font-medium text-text">
                    No {activeFilter.toLowerCase()} documents
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("All")}
                    className="mt-2 text-xs font-medium text-brand hover:underline"
                  >
                    Show all documents
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile: stacked list, no sideways scrolling */}
                  <ul className="divide-y divide-border md:hidden">
                    {filteredDocuments.map((doc) => (
                      <li key={doc.id}>
                        <Link
                          href={documentHref(doc)}
                          className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-raised/50 focus-visible:bg-surface-raised/50 focus-visible:outline-none"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${doc.color}`}
                          >
                            <FileText size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text">
                              {doc.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-text-muted">
                              {doc.modified} · {doc.size}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[doc.status]}`}
                          >
                            {doc.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {/* Tablet / desktop: table */}
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
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${doc.color}`}
                                >
                                  <FileText size={19} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-text">
                                    {doc.name}
                                  </p>
                                  <p className="mt-1 text-xs text-text-muted">
                                    {doc.type} · {doc.size}
                                  </p>
                                </div>
                              </Link>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm text-text-muted">
                                {doc.modified}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[doc.status]}`}
                              >
                                {doc.status}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {/* Row actions (rename, delete, ...) come later.
                              <button
                                type="button"
                                aria-label={`More actions for ${doc.name}`}
                                className="rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              */}
                              <ChevronRight
                                size={17}
                                className="text-text-muted transition-colors group-hover:text-text"
                                aria-hidden
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

        {/* Replaces the dismissible "Getting started" banner: shown only
            while there are no documents, so it needs no dismiss state. */}
        {!hasDocuments && (
          <section aria-labelledby="how-it-works-heading">
            <h2
              id="how-it-works-heading"
              className="mb-4 text-base font-semibold text-text"
            >
              How it works
            </h2>

            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <li
                  key={title}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-text">
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-medium text-text-muted">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Templates section: hidden until templates exist.
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text">
                Explore templates
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Start faster with ready-made documents.
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-text hover:text-brand"
            >
              Browse all <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  type="button"
                  key={template.name}
                  className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand/50"
                >
                  <div
                    className={`mb-4 flex h-28 items-center justify-center rounded-lg ${template.color}`}
                  >
                    <div className="flex h-16 w-12 items-center justify-center rounded-md bg-white shadow-sm">
                      <Icon size={24} className={template.accent} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-text">{template.name}</p>
                  <p className="mt-1 text-xs text-text-muted">{template.category}</p>
                  <p className="mt-3 text-xs text-text-muted">{template.description}</p>
                </button>
              );
            })}
          </div>
        </section>
        */}
      </div>
    </section>
  );
}
