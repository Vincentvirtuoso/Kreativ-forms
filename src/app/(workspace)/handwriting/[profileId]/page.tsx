"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { HandwritingCapture } from "@/features/handwriting/components/HandwritingCapture";
import { TOTAL_GLYPHS } from "@/features/handwriting/utils/glyph-set";
import { handwritingProfileService } from "@/features/handwriting/services/handwriting-profile.service";

import type { HandwritingProfile } from "@/features/handwriting/domain/handwriting-profile.types";
import type { CapturedGlyph } from "@/features/handwriting/domain/handwriting.types";
import { Button } from "@splenddev/kreativ-ui";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useConfirm } from "@/components/providers/ConfirmProvider";

type PageStatus = "loading" | "ready" | "saving" | "generating" | "error";

const ASSETS_HREF = "/dashboard?tab=assets";

export default function HandwritingProfilePage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const profileId = params.profileId;
  const confirm = useConfirm();

  const [profile, setProfile] = useState<HandwritingProfile | null>(null);
  const [glyphs, setGlyphs] = useState<CapturedGlyph[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [savedGlyphsJson, setSavedGlyphsJson] = useState("[]");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);

      const result = await handwritingProfileService.getById(profileId);

      if (!result) {
        setProfile(null);
        setError("This handwriting profile could not be found.");
        setStatus("error");
        return;
      }

      setProfile(result);
      setGlyphs(result.glyphs ?? []);
      setSavedGlyphsJson(JSON.stringify(result.glyphs ?? []));
      setName(result.name);
      setStatus("ready");
    } catch {
      setError("Something went wrong while loading this profile.");
      setStatus("error");
    }
  }, [profileId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Compared with what's saved, so drawing something and undoing it, or
  // typing the old name back, doesn't count as a change.
  const glyphsJson = useMemo(() => JSON.stringify(glyphs), [glyphs]);
  const nameChanged = profile ? name.trim() !== profile.name : false;
  const hasUnsavedChanges = glyphsJson !== savedGlyphsJson || nameChanged;

  const guard = useUnsavedChangesGuard(hasUnsavedChanges);

  const handleGlyphChange = useCallback((nextGlyphs: CapturedGlyph[]) => {
    setGlyphs(nextGlyphs);
  }, []);

  /** Save the name and glyphs, and optionally generate the font too. */
  async function persist({ generate }: { generate: boolean }) {
    if (!profile) return false;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Give your handwriting profile a name.");
      nameInputRef.current?.focus();
      return false;
    }

    try {
      setStatus(generate ? "generating" : "saving");
      setError(null);

      if (trimmedName !== profile.name) {
        await handwritingProfileService.update(profileId, {
          name: trimmedName,
        });
      }

      await handwritingProfileService.saveGlyphs(profileId, glyphs);

      if (generate) {
        await handwritingProfileService.generateFont(profileId);
      }

      await loadProfile();
      setLastSavedAt(new Date());

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : generate
            ? "Unable to generate your font."
            : "Unable to save your changes.",
      );
      setStatus("ready");

      return false;
    }
  }

  // Ctrl/Cmd+S saves. The ref keeps the listener from going stale.
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => {
    saveRef.current = () => {
      if (hasUnsavedChanges && status !== "saving" && status !== "generating") {
        void persist({ generate: false });
      }
    };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleDelete() {
    if (!profile) return;

    const ok = await confirm({
      title: `Delete "${profile.name}"?`,
      description:
        "This permanently removes its handwriting data and generated font. This can't be undone.",
      confirmLabel: "Delete profile",
      cancelLabel: "Cancel",
      confirmColor: "destructive",
    });

    if (!ok) return;

    try {
      await handwritingProfileService.delete(profileId);
      guard.allowNavigation();
      router.push(ASSETS_HREF);
    } catch {
      setError("Unable to delete this handwriting profile.");
    }
  }

  if (status === "loading" && !profile) {
    return (
      <main
        className="mx-auto w-full max-w-7xl p-6"
        aria-busy="true"
        aria-label="Loading handwriting profile"
      >
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-32 rounded bg-surface-muted" />
          <div className="h-10 w-64 rounded bg-surface-muted" />
          <div className="h-5 w-96 max-w-full rounded bg-surface-muted" />
          <div className="h-105 rounded-xl border border-border bg-surface-muted/40" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-text-muted">
          <span className="text-2xl">Aa</span>
        </div>

        <h1 className="text-xl font-semibold text-text">Profile unavailable</h1>

        <p className="mt-2 max-w-sm text-sm text-text-muted">
          {error ?? "This handwriting profile may have been deleted."}
        </p>

        <Link
          href={ASSETS_HREF}
          className="mt-6 inline-flex items-center rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Back to assets
        </Link>
      </main>
    );
  }

  const saving = status === "saving";
  const generating = status === "generating";
  const isBusy = saving || generating;
  const canGenerate = glyphs.length > 0 && !isBusy;
  const fontReady = profile.status === "ready";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link
          href={ASSETS_HREF}
          className="inline-flex items-center gap-2 text-sm text-text-muted transition hover:text-text"
        >
          <span aria-hidden="true">←</span>
          Back to assets
        </Link>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          color="destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2 size={14} />
          Delete profile
        </Button>
      </div>

      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-muted">
              Handwriting profile
            </span>

            <span
              aria-live="polite"
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                hasUnsavedChanges
                  ? "bg-amber-500/10 text-amber-600"
                  : fontReady
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-surface-muted text-text-muted"
              }`}
            >
              {hasUnsavedChanges
                ? "Unsaved changes"
                : fontReady
                  ? "Font generated"
                  : "Draft"}
            </span>
          </div>

          <label
            htmlFor="profile-name"
            className="mb-2 block text-xs font-medium text-text-muted"
          >
            Profile name
          </label>

          <input
            ref={nameInputRef}
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. My cursive handwriting"
            className="w-full max-w-xl border-0 border-b border-border bg-transparent px-0 py-2 text-2xl font-semibold tracking-tight text-text outline-none transition focus:border-brand sm:text-3xl"
          />

          <p className="mt-2 text-sm text-text-muted">
            Capture your handwriting and turn it into a reusable font.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void persist({ generate: false })}
            disabled={isBusy || !hasUnsavedChanges}
            isLoading={saving}
            color="neutral"
            variant="outline"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>

          <Button
            type="button"
            onClick={() => void persist({ generate: true })}
            disabled={!canGenerate}
            isLoading={generating}
            title={
              glyphs.length === 0
                ? "Capture at least one character first"
                : undefined
            }
          >
            {generating
              ? "Generating..."
              : fontReady
                ? "Regenerate font"
                : "Generate font"}
          </Button>
        </div>
      </section>

      {error && (
        <Alert title="That didn't work" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">
              Character workspace
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Draw each character naturally. Your captured glyphs belong to this
              profile.
            </p>
          </div>

          <span className="text-sm tabular-nums text-text-muted">
            {glyphs.length} of {TOTAL_GLYPHS} characters captured
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <HandwritingCapture
            key={profile.id}
            initialGlyphs={profile.glyphs ?? []}
            onGlyphsChange={handleGlyphChange}
          />
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-text-muted">
        <p>
          {hasUnsavedChanges
            ? "You have unsaved changes."
            : lastSavedAt
              ? `All changes saved at ${lastSavedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}.`
              : "All changes saved."}
        </p>

        <p>
          {profile.fontFormat.toUpperCase()} font
          {profile.updatedAt
            ? ` · Updated ${new Date(profile.updatedAt).toLocaleDateString()}`
            : ""}
        </p>
      </footer>

      {/* Stays in view while you work, so Save is never scrolled away. */}
      {hasUnsavedChanges && (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-amber-500"
            />

            <p className="text-sm text-text">Unsaved changes</p>

            <Button
              type="button"
              size="sm"
              onClick={() => void persist({ generate: false })}
              disabled={isBusy}
              isLoading={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Multi-action leave guard — stays declarative */}
      <ConfirmDialog
        open={guard.isPrompting}
        title="Leave without saving?"
        description="You have unsaved changes to this handwriting profile. If you leave now, they'll be lost."
        busy={saving}
        onCancel={guard.stay}
        actions={[
          {
            label: "Keep editing",
            onClick: guard.stay,
            autoFocus: true,
          },
          {
            label: "Discard and leave",
            onClick: guard.proceed,
            variant: "ghost",
            color: "destructive",
          },
          {
            label: "Save and leave",
            variant: "solid",
            color: "brand",
            loading: saving,
            onClick: async () => {
              if (await persist({ generate: false })) guard.proceed();
            },
          },
        ]}
      />
    </main>
  );
}
