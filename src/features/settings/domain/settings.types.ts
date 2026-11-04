export interface UserProfile {
  displayName: string;
  email: string;
}

export interface AppPreferences {
  confirmBeforeDelete: boolean;
}

export interface AppSettings {
  profile: UserProfile;
  preferences: AppPreferences;
}

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    displayName: "",
    email: "",
  },
  preferences: {
    confirmBeforeDelete: true,
  },
};
