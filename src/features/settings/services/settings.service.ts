import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type UserProfile,
  type AppPreferences,
} from "../domain/settings.types";

export interface SettingsUpdate {
  profile?: Partial<UserProfile>;
  preferences?: Partial<AppPreferences>;
}

const STORAGE_KEY = "kreativ-forms-settings";

export class SettingsService {
  get(): AppSettings {
    if (typeof window === "undefined") {
      return structuredClone(DEFAULT_SETTINGS);
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return structuredClone(DEFAULT_SETTINGS);

      const parsed = JSON.parse(stored) as Partial<AppSettings>;

      return {
        profile: {
          ...DEFAULT_SETTINGS.profile,
          ...parsed.profile,
        },
        preferences: {
          ...DEFAULT_SETTINGS.preferences,
          ...parsed.preferences,
        },
      };
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  update(updates: SettingsUpdate): AppSettings {
    const current = this.get();

    const next: AppSettings = {
      profile: {
        ...current.profile,
        ...updates.profile,
      },
      preferences: {
        ...current.preferences,
        ...updates.preferences,
      },
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    return next;
  }
}

export const settingsService = new SettingsService();
