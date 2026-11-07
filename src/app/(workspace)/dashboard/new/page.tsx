import Link from "next/link";
import { ArrowLeft, FilePlus2, FileText, ShieldCheck, Zap } from "lucide-react";

import { DocumentImportForm } from "@/features/documents/import/components/DocumentImportForm";
import { ImportFormClient } from "./import-form-client";

const benefits = [
  {
    icon: FileText,
    title: "Multiple formats",
    description: "Import PDFs, PNGs and JPEG images.",
  },
  {
    icon: ShieldCheck,
    title: "Your documents",
    description: "Choose how your documents are stored.",
  },
  {
    icon: Zap,
    title: "Ready to edit",
    description: "Prepare your files before opening the editor.",
  },
];

type NewDocumentPageProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

export default async function NewDocumentPage({
  searchParams,
}: NewDocumentPageProps) {
  const { type } = await searchParams;
  const isBlank = (Array.isArray(type) ? type[0] : type) === "blank";

  if (isBlank) {
    return <BlankDocumentComingSoon />;
  }

  return (
    <section>
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <header className="mb-8 max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-muted">
                <FileText className="h-3.5 w-3.5" />
                New document
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                Bring your documents to life.
              </h1>

              <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
                Upload an existing document or images. We'll prepare everything
                so you can review your pages before editing.
              </p>
            </header>

            <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <ImportFormClient />
            </section>
          </div>

          <aside
            className="
              self-start
              space-y-7
              lg:sticky lg:top-18
              lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto
            "
          >
            <div>
              <h2 className="text-sm font-semibold text-text">
                A simpler way to work with documents
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Everything starts with your existing files. Import, organize and
                prepare them before moving into the editor.
              </p>
            </div>

            <div className="space-y-6">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised">
                    <Icon className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="text-xs font-medium text-text">Supported files</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["PDF", "PNG", "JPG"].map((format) => (
                  <span
                    key={format}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-muted"
                  >
                    {format}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Maximum file size: 25 MB per file.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function BlankDocumentComingSoon() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-muted">
            <FilePlus2 className="h-6 w-6" />
          </div>

          <span className="inline-flex rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-muted">
            Coming soon
          </span>

          <h1 className="mt-4 text-xl font-semibold tracking-tight text-text">
            Blank documents are on the way
          </h1>

          <p className="mt-2 text-sm leading-6 text-text-muted">
            You'll soon be able to start from an empty page. For now, upload a
            PDF or image and fill it in.
          </p>

          <Link
            href="/dashboard/new"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Upload a document instead
          </Link>
        </div>
      </div>
    </section>
  );
}
