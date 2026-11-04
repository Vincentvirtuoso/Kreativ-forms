"use client";

import { useEffect, useState } from "react";
import {
  UserRound,
  Palette,
  SlidersHorizontal,
  HardDrive,
  Save,
} from "lucide-react";

import { useSettings } from "@/features/settings/providers/settings-provider";
import { Switch } from "@splenddev/kreativ-ui";

export function SettingsView() {
  const { settings, loading, updateProfile, updatePreferences } = useSettings();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(settings.profile.displayName);
    setEmail(settings.profile.email);
  }, [settings.profile]);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    updateProfile({
      displayName: displayName.trim(),
      email: email.trim(),
    });

    setSaved(true);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded bg-surface-raised" />
        <div className="h-48 rounded-xl bg-surface-raised" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage your profile and application preferences.
        </p>
      </header>

      {/* Profile */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
            <UserRound size={19} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Profile</h2>
            <p className="text-xs text-text-muted">Your personal information</p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-border bg-surface p-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="display-name"
              className="text-xs font-medium text-text"
            >
              Display name
            </label>

            <input
              id="display-name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setSaved(false);
              }}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-email"
              className="text-xs font-medium text-text"
            >
              Email address
            </label>

            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSaved(false);
              }}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-brand"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p role="status" className="text-xs text-text-muted">
              {saved ? "Changes saved." : "Stored on this device."}
            </p>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-brand-fg transition-opacity hover:opacity-90"
            >
              <Save size={14} />
              Save changes
            </button>
          </div>
        </form>
      </section>

      {/* Appearance */}
      {/* <SettingsSection
        icon={<Palette size={19} />}
        title="Appearance"
        description="Control how Kreativ Forms looks."
      >
        <p className="text-xs leading-5 text-text-muted">
          Theme preferences will be connected to the Kreativ UI theme provider.
        </p>
      </SettingsSection> */}

      {/* Preferences */}
      <SettingsSection
        icon={<SlidersHorizontal size={19} />}
        title="Preferences"
        description="Customize application behaviour."
      >
        <div className="divide-y divide-border">
          <label className="flex cursor-pointer items-center justify-between gap-4 p-3">
            <div>
              <p className="text-sm font-medium text-text">
                Confirm before deleting
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Ask for confirmation before deleting documents.
              </p>
            </div>
            <Switch
              checked={settings.preferences.confirmBeforeDelete}
              onChange={(event) =>
                updatePreferences({
                  confirmBeforeDelete: event.target.checked,
                })
              }
            />
          </label>
        </div>
      </SettingsSection>

      {/* Storage */}
      <SettingsSection
        icon={<HardDrive size={19} />}
        title="Storage"
        description="Understand where your documents are stored."
      >
        <div className="space-y-3">
          <StorageRow label="Storage location" value="This device" />
          <StorageRow label="Storage technology" value="IndexedDB" />
          <StorageRow label="Cloud synchronization" value="Not available" />

          <div className="rounded-lg bg-surface-raised p-3">
            <p className="text-xs leading-5 text-text-muted">
              Your documents are stored locally on this device. They won't
              automatically appear on other devices. Export important documents
              to keep your own backups.
            </p>
          </div>
        </div>
      </SettingsSection>
    </section>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        {children}
      </div>
    </section>
  );
}

function StorageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
