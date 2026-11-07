"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSignature,
  FileText,
  PenLine,
  Plus,
  UploadCloud,
} from "lucide-react";

import { useDocuments, type WorkspaceDocument } from "../hooks/useDocuments";
import { useWorkspaceAssets } from "../hooks/useWorkspaceAssets";

function formatEdited(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  }).format(Math.round((date.getTime() - Date.now()) / 86_400_000), "day");
}

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

function RecentDocument({ document }: { document: WorkspaceDocument }) {
  const status = statusConfig[document.status];

  return (
    <Link
      href={`/editor/${document.id}`}
      className="group flex items-center gap-3 border-b border-border px-4 py-4 last:border-0 transition-colors hover:bg-surface-raised/50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
        <FileText size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">
          {document.name}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Edited {formatEdited(document.updatedAt)}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${status.className}`}
      >
        {status.label}
      </span>

      <ArrowRight
        size={15}
        className="shrink-0 text-text-muted transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

function DocumentStatusChart({
  draft,
  inProgress,
  completed,
}: {
  draft: number;
  inProgress: number;
  completed: number;
}) {
  const total = draft + inProgress + completed;
  const circumference = 2 * Math.PI * 42;

  const segments = [
    { label: "Completed", value: completed, color: "text-success" },
    { label: "In progress", value: inProgress, color: "text-brand" },
    { label: "Draft", value: draft, color: "text-text-muted" },
  ];

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-surface-raised"
          />

          {total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / total) * circumference;
              const currentOffset = offset;
              offset += length;

              if (segment.value === 0) return null;

              return (
                <circle
                  key={segment.label}
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-currentOffset}
                  className={segment.color}
                />
              );
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-text">
            {total}
          </span>
          <span className="text-xs text-text-muted">Documents</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  segment.label === "Completed"
                    ? "bg-success"
                    : segment.label === "In progress"
                      ? "bg-brand"
                      : "bg-text-muted"
                }`}
              />
              <span className="text-sm text-text-muted">{segment.label}</span>
            </div>

            <span className="text-sm font-semibold tabular-nums text-text">
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetDistribution({
  signatures,
  handwriting,
}: {
  signatures: number;
  handwriting: number;
}) {
  const total = signatures + handwriting;
  const maximum = Math.max(signatures, handwriting, 1);

  const items = [
    {
      label: "Signatures",
      value: signatures,
      icon: FileSignature,
      color: "bg-brand",
    },
    {
      label: "Handwriting profiles",
      value: handwriting,
      icon: PenLine,
      color: "bg-success",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-3xl font-semibold tabular-nums text-text">{total}</p>
        <p className="mt-1 text-xs text-text-muted">
          Reusable assets stored on this device
        </p>
      </div>

      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-text-muted">
              <Icon size={15} />
              {label}
            </span>

            <span className="text-sm font-medium tabular-nums text-text">
              {value}
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-surface-raised"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={maximum}
            aria-valuenow={value}
          >
            <div
              className={`h-full rounded-full transition-all ${color}`}
              style={{
                width: `${(value / maximum) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <Icon size={17} className="text-text-muted" />
      </div>

      <p className="mt-4 text-3xl font-semibold tabular-nums text-text">
        {loading ? "—" : value}
      </p>
    </div>
  );
}

export function OverviewView() {
  const {
    documents,
    loading: documentsLoading,
    error: documentsError,
    reload,
  } = useDocuments();

  const {
    signatures,
    handwritingProfiles,
    loading: assetsLoading,
    error: assetsError,
    reload: reloadAssets,
  } = useWorkspaceAssets();

  const loading = documentsLoading || assetsLoading;

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 3),
    [documents],
  );

  const documentStats = useMemo(
    () => ({
      total: documents.length,
      draft: documents.filter((doc) => doc.status === "draft").length,
      inProgress: documents.filter((doc) => doc.status === "in_progress")
        .length,
      completed: documents.filter((doc) => doc.status === "completed").length,
    }),
    [documents],
  );

  const assetStats = useMemo(
    () => ({
      signatures: signatures.length,
      handwriting: handwritingProfiles.length,
      generated: handwritingProfiles.filter(
        (profile) => profile.status === "ready",
      ).length,
      drafts: handwritingProfiles.filter(
        (profile) => profile.status !== "ready",
      ).length,
      glyphs: handwritingProfiles.reduce(
        (total, profile) => total + profile.glyphCount,
        0,
      ),
    }),
    [signatures, handwritingProfiles],
  );

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8">
      {/* Welcome */}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Your workspace
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Welcome back
          </h1>

          <p className="max-w-lg text-sm leading-6 text-text-muted">
            Everything you need to fill, sign and personalize your documents,
            all in one place.
          </p>
        </div>
      </header>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickAction
          href="/dashboard/new"
          icon={UploadCloud}
          title="Upload a document"
          description="Import a PDF or image from your device."
        />

        <QuickAction
          href="/dashboard?tab=uploaded"
          icon={FileText}
          title="Browse documents"
          description="Manage your documents and access your trash."
        />
      </div>

      {/* Workspace statistics */}
      <section className="space-y-4">
        <SectionHeading
          title="Workspace overview"
          description="A snapshot of your documents and reusable assets."
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <OverviewCard
            label="Documents"
            value={documentStats.total}
            icon={FileText}
            loading={loading}
          />

          <OverviewCard
            label="In progress"
            value={documentStats.inProgress}
            icon={Clock3}
            loading={loading}
          />

          <OverviewCard
            label="Completed"
            value={documentStats.completed}
            icon={CheckCircle2}
            loading={loading}
          />

          <OverviewCard
            label="Signatures"
            value={assetStats.signatures}
            icon={FileSignature}
            loading={loading}
          />

          <OverviewCard
            label="Handwriting"
            value={assetStats.handwriting}
            icon={PenLine}
            loading={loading}
          />
        </div>
      </section>

      {/* Analytics */}
      <section className="space-y-4">
        <SectionHeading
          title="Workspace analytics"
          description="Understand how your workspace is being used."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text">Document status</h3>
            <p className="mt-1 text-xs text-text-muted">
              Distribution of your documents.
            </p>

            <div className="mt-6">
              {loading ? (
                <div className="h-40 animate-pulse rounded-lg bg-surface-raised" />
              ) : (
                <DocumentStatusChart
                  draft={documentStats.draft}
                  inProgress={documentStats.inProgress}
                  completed={documentStats.completed}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text">
              Asset distribution
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Your reusable signatures and handwriting profiles.
            </p>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-5">
                  <div className="h-8 w-20 animate-pulse rounded bg-surface-raised" />
                  <div className="h-3 animate-pulse rounded bg-surface-raised" />
                  <div className="h-3 animate-pulse rounded bg-surface-raised" />
                </div>
              ) : (
                <AssetDistribution
                  signatures={assetStats.signatures}
                  handwriting={assetStats.handwriting}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Handwriting insights */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-text">
              Handwriting library
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Your personal typography assets.
            </p>
          </div>

          <Link
            href="/dashboard?tab=assets"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Manage profiles
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-text">
              {assetsLoading ? "—" : assetStats.generated}
            </p>
            <p className="mt-1 text-xs text-text-muted">Generated fonts</p>
          </div>

          <div>
            <p className="text-2xl font-semibold tabular-nums text-text">
              {assetsLoading ? "—" : assetStats.drafts}
            </p>
            <p className="mt-1 text-xs text-text-muted">Draft profiles</p>
          </div>

          <div>
            <p className="text-2xl font-semibold tabular-nums text-text">
              {assetsLoading ? "—" : assetStats.glyphs}
            </p>
            <p className="mt-1 text-xs text-text-muted">Captured characters</p>
          </div>
        </div>
      </section>

      {/* Recent documents */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text">
              Continue working
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Pick up where you left off.
            </p>
          </div>

          <Link
            href="/dashboard?tab=uploaded"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            View all
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {documentsLoading ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex animate-pulse gap-3">
                  <div className="size-10 rounded-lg bg-surface-raised" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-1/3 rounded bg-surface-raised" />
                    <div className="h-2 w-1/4 rounded bg-surface-raised" />
                  </div>
                </div>
              ))}
            </div>
          ) : documentsError ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-destructive">{documentsError}</p>
              <button
                type="button"
                onClick={() => void reload()}
                className="mt-3 text-xs font-medium text-brand hover:underline"
              >
                Try again
              </button>
            </div>
          ) : recentDocuments.length > 0 ? (
            recentDocuments.map((document) => (
              <RecentDocument key={document.id} document={document} />
            ))
          ) : (
            <div className="px-5 py-12 text-center">
              <FileText size={25} className="mx-auto mb-3 text-text-muted" />
              <h3 className="text-sm font-semibold text-text">
                Your workspace is ready
              </h3>
              <p className="mt-2 text-xs text-text-muted">
                Upload your first document to get started.
              </p>
              <Link
                href="/dashboard/new"
                className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-brand hover:underline"
              >
                Upload document
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {(documentsError || assetsError) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-red-600"
        >
          <span>{assetsError || documentsError}</span>
          <button
            type="button"
            onClick={() => {
              void reload();
              void reloadAssets();
            }}
            className="font-medium underline"
          >
            Retry loading
          </button>
        </div>
      )}
    </section>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/40"
    >
      <div className="flex size-11 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </div>

      <ArrowRight
        size={16}
        className="text-text-muted transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
