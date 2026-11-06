"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  FileType,
  LoaderCircle,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";

import type {
  HandwritingProfile,
  HandwritingProfileId,
} from "../domain/handwriting-profile.types";

import { handwritingProfileService } from "../services/handwriting-profile.service";

interface HandwritingLibraryProps {
  onOpenProfile: (id: HandwritingProfileId) => void;
}

export function HandwritingLibrary({ onOpenProfile }: HandwritingLibraryProps) {
  const [profiles, setProfiles] = useState<HandwritingProfile[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<HandwritingProfileId | null>(null);
  const [editingName, setEditingName] = useState("");

  const [deletingId, setDeletingId] = useState<HandwritingProfileId | null>(
    null,
  );

  const loadProfiles = useCallback(async () => {
    try {
      setError(null);
      const result = await handwritingProfileService.getAll();
      setProfiles(result);
    } catch {
      setError("We couldn't load your handwriting profiles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return profiles;

    return profiles.filter((profile) =>
      profile.name.toLowerCase().includes(query),
    );
  }, [profiles, search]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || isCreating) return;

    try {
      setIsCreating(true);
      setError(null);

      const profile = await handwritingProfileService.createDraft({
        name: trimmedName,
      });

      setName("");
      await loadProfiles();
      onOpenProfile(profile.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create your profile.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (id: HandwritingProfileId) => {
    const trimmedName = editingName.trim();

    if (!trimmedName) {
      setError("Enter a profile name.");
      return;
    }

    try {
      setError(null);

      await handwritingProfileService.update(id, {
        name: trimmedName,
      });

      setEditingId(null);
      setEditingName("");
      await loadProfiles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to rename profile.",
      );
    }
  };

  const handleDelete = async (id: HandwritingProfileId) => {
    try {
      setDeletingId(id);
      setError(null);

      await handwritingProfileService.delete(id);
      setProfiles((current) => current.filter((profile) => profile.id !== id));
    } catch {
      setError("Unable to delete this handwriting profile.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-6">
      {/* Library heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Type className="size-4 text-text-muted" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Personal typography
            </span>
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-text">
            Handwriting profiles
          </h2>

          <p className="max-w-xl text-sm leading-6 text-text-muted">
            Turn your handwriting into reusable fonts. Create different styles
            for different documents.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="size-2 rounded-full bg-brand" />
          Stored on this device
        </div>
      </div>

      {/* Create profile */}
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-background px-3">
            <PenLine className="size-4 shrink-0 text-text-muted" />

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Give your handwriting a name..."
              maxLength={60}
              aria-label="New handwriting profile name"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isCreating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create profile
          </button>
        </div>

        <p className="mt-3 text-xs text-text-muted">
          Examples: My Cursive, Everyday Print, Formal Handwriting.
        </p>
      </form>

      {/* Search and count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search profiles..."
            aria-label="Search handwriting profiles"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-brand"
          />
        </div>

        <span className="text-xs text-text-muted">
          {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600"
        >
          <X className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-surface">
            {search ? (
              <Search className="size-5 text-text-muted" />
            ) : (
              <PenLine className="size-5 text-text-muted" />
            )}
          </div>

          <h3 className="font-medium text-text">
            {search
              ? "No matching profiles"
              : "Your handwriting library is empty"}
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">
            {search
              ? "Try a different search term."
              : "Create your first profile and start capturing your own handwriting."}
          </p>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-4 text-sm font-medium text-brand hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <HandwritingProfileCard
              key={profile.id}
              profile={profile}
              editing={editingId === profile.id}
              editingName={editingName}
              deleting={deletingId === profile.id}
              onEditingNameChange={setEditingName}
              onStartRename={() => {
                setEditingId(profile.id);
                setEditingName(profile.name);
              }}
              onCancelRename={() => {
                setEditingId(null);
                setEditingName("");
              }}
              onSaveRename={() => void handleRename(profile.id)}
              onDelete={() => void handleDelete(profile.id)}
              onOpen={() => onOpenProfile(profile.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface HandwritingProfileCardProps {
  profile: HandwritingProfile;
  editing: boolean;
  editingName: string;
  deleting: boolean;
  onEditingNameChange: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

function HandwritingProfileCard({
  profile,
  editing,
  editingName,
  deleting,
  onEditingNameChange,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDelete,
  onOpen,
}: HandwritingProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-brand/40">
      {/* Preview */}
      <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-border bg-background">
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_bottom,transparent_31px,var(--color-border)_32px)] bg-size-[100%_32px]" />

        <div className="relative text-center">
          <p className="font-serif text-4xl tracking-wide text-text">
            Aa Bb Cc
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Handwriting preview
          </p>
        </div>

        <span
          className={`absolute right-3 top-3 rounded-md px-2 py-1 text-[10px] font-medium ${
            profile.status === "ready"
              ? "bg-brand/10 text-brand"
              : "bg-surface text-text-muted"
          }`}
        >
          {profile.status === "ready" ? "Generated" : "Draft"}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={editingName}
                  onChange={(event) => onEditingNameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onSaveRename();
                    if (event.key === "Escape") onCancelRename();
                  }}
                  maxLength={60}
                  aria-label="Profile name"
                  className="h-9 w-full rounded-md border border-brand bg-background px-2 text-sm outline-none"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={!editingName.trim()}
                    onClick={onSaveRename}
                    className="text-xs font-medium text-brand disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={onCancelRename}
                    className="text-xs text-text-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="truncate text-sm font-semibold text-text">
                  {profile.name}
                </h3>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock3 className="size-3" />
                  Updated {new Date(profile.updatedAt).toLocaleDateString()}
                </p>
              </>
            )}
          </div>

          {!editing && (
            <div className="relative">
              <button
                type="button"
                aria-label={`Actions for ${profile.name}`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-background hover:text-text"
              >
                <MoreHorizontal className="size-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-border bg-surface p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onStartRename();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-xs text-text hover:bg-background"
                  >
                    Rename
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    disabled={deleting}
                    className="w-full rounded-md px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/5 disabled:opacity-50"
                  >
                    Delete profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{profile.glyphCount} characters captured</span>
          <span className="flex items-center gap-1">
            <FileType className="size-3.5" />
            TTF
          </span>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-text transition-colors hover:border-brand hover:bg-brand/5"
        >
          Continue editing
          <ArrowUpRight className="size-4" />
        </button>
      </div>
    </article>
  );
}
