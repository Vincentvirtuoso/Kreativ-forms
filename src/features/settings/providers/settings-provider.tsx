"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type UserProfile,
  type AppPreferences,
} from "../domain/settings.types";

import {
  settingsService,
  type SettingsUpdate,
} from "../services/settings.service";

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: SettingsUpdate) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updatePreferences: (preferences: Partial<AppPreferences>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSettings(settingsService.get());
    setLoading(false);

    // Keep settings synchronized across browser tabs.
    function handleStorage(event: StorageEvent) {
      if (event.key === "kreativ-forms-settings") {
        setSettings(settingsService.get());
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateSettings = useCallback((updates: SettingsUpdate) => {
    const next = settingsService.update(updates);
    setSettings(next);
  }, []);

  const updateProfile = useCallback(
    (profile: Partial<UserProfile>) => {
      updateSettings({ profile });
    },
    [updateSettings],
  );

  const updatePreferences = useCallback(
    (preferences: Partial<AppPreferences>) => {
      updateSettings({ preferences });
    },
    [updateSettings],
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        updateProfile,
        updatePreferences,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider.");
  }

  return context;
}
