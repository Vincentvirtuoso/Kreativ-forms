"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  UploadCloud,
  FilePlus2,
  LayoutTemplate,
  MoreHorizontal,
  FileText,
  Clock3,
  CheckCircle2,
  PenLine,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronRight,
  FolderOpen,
  Sparkles,
  X,
} from "lucide-react";

type DocumentStatus = "Draft" | "In progress" | "Completed";

type Document = {
  id: number;
  name: string;
  type: string;
  size: string;
  modified: string;
  status: DocumentStatus;
  color: string;
};

const documents: Document[] = [
  {
    id: 1,
    name: "Client Service Agreement",
    type: "PDF document",
    size: "2.4 MB",
    modified: "Today, 10:42 AM",
    status: "In progress",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: 2,
    name: "Tax Registration Form",
    type: "PDF document",
    size: "1.8 MB",
    modified: "Today, 9:15 AM",
    status: "Completed",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 3,
    name: "Employment Application",
    type: "PDF document",
    size: "856 KB",
    modified: "Yesterday",
    status: "Draft",
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: 4,
    name: "Property Lease Agreement",
    type: "PDF document",
    size: "3.1 MB",
    modified: "Oct 30, 2026",
    status: "In progress",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: 5,
    name: "Invoice Template",
    type: "PDF document",
    size: "640 KB",
    modified: "Oct 28, 2026",
    status: "Completed",
    color: "bg-emerald-50 text-emerald-600",
  },
];

const templates = [
  {
    name: "Business Contract",
    category: "Legal",
    description: "Professional agreements for businesses.",
    color: "bg-blue-50",
    accent: "text-blue-600",
    icon: FileText,
  },
  {
    name: "Invoice",
    category: "Finance",
    description: "Create and manage payment invoices.",
    color: "bg-amber-50",
    accent: "text-amber-600",
    icon: FileText,
  },
  {
    name: "Application Form",
    category: "General",
    description: "Collect information with ease.",
    color: "bg-violet-50",
    accent: "text-violet-600",
    icon: FileText,
  },
];

const statusStyles: Record<DocumentStatus, string> = {
  Draft: "bg-amber-50 text-amber-700",
  "In progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

export default function DashboardHome() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showOnboarding, setShowOnboarding] = useState(true);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === "All" || doc.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter]);

  const stats = [
    {
      label: "Total documents",
      value: "24",
      icon: FileText,
      color: "text-text-muted",
    },
    {
      label: "In progress",
      value: "08",
      icon: PenLine,
      color: "text-blue-600",
    },
    {
      label: "Completed",
      value: "16",
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
  ];

  return (
    <section className="min-h-screen">
      <div className="mx-auto max-w-360 space-y-9">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm text-text-muted">
              Sunday, November 2, 2026
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Good evening
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Here's what's happening with your documents.
            </p>
          </div>

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
        </header>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">Quick actions</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand/50 hover:bg-surface-raised"
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
              <ArrowUpRight size={17} className="text-text-muted" />
            </button>

            <button
              type="button"
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand/50 hover:bg-surface-raised"
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
              <ArrowUpRight size={17} className="text-text-muted" />
            </button>

            <button
              type="button"
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
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-text">Overview</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-5"
              >
                <div>
                  <p className="text-sm text-text-muted">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-text">
                    {value}
                  </p>
                </div>
                <div className={`rounded-lg bg-surface-raised p-3 ${color}`}>
                  <Icon size={21} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-text">
                Recent documents
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Pick up where you left off.
              </p>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-text hover:text-brand"
            >
              View all <ChevronRight size={16} />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <div className="flex flex-wrap items-center gap-1">
                {["All", "Draft", "In progress", "Completed"].map((filter) => (
                  <button
                    type="button"
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeFilter === filter
                        ? "bg-surface-raised text-text"
                        : "text-text-muted hover:bg-surface-raised hover:text-text"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-raised"
              >
                <SlidersHorizontal size={14} />
                Filter
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-162 text-left">
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
                    <th className="w-12 px-5 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="group cursor-pointer transition-colors hover:bg-surface-raised/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${doc.color}`}
                          >
                            <FileText size={19} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text">
                              {doc.name}
                            </p>
                            <p className="mt-1 text-xs text-text-muted">
                              {doc.type} · {doc.size}
                            </p>
                          </div>
                        </div>
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
                        <button
                          type="button"
                          aria-label={`More actions for ${doc.name}`}
                          className="rounded-md p-2 text-text-muted opacity-100 hover:bg-surface-raised hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredDocuments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center">
                        <FolderOpen
                          className="mx-auto mb-3 text-text-muted"
                          size={26}
                        />
                        <p className="text-sm font-medium text-text">
                          No documents found
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Try adjusting your search or filters.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-5 py-3">
              <p className="text-xs text-text-muted">
                Showing {filteredDocuments.length} of {documents.length}{" "}
                documents
              </p>
            </div>
          </div>
        </section>

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

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {template.name}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {template.category}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={17}
                      className="text-text-muted transition-colors group-hover:text-text"
                    />
                  </div>

                  <p className="mt-3 text-xs text-text-muted">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {showOnboarding && (
          <section className="relative overflow-hidden rounded-xl border border-border bg-surface-raised p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setShowOnboarding(false)}
              aria-label="Dismiss getting started"
              className="absolute right-4 top-4 rounded-md p-1 text-text-muted hover:bg-surface"
            >
              <X size={17} />
            </button>

            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-text">
                <Sparkles size={14} />
                Getting started
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-text">
                Your documents, made simpler.
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                Upload a PDF, fill in its fields, add your signature, and export
                a finished document. Everything you need in one workspace.
              </p>

              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg hover:bg-brand-hover"
              >
                Get started
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
