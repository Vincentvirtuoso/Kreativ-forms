"use client";

import { useCallback } from "react";
import { useSettings } from "../providers/settings-provider";

export function useDeleteConfirmation() {
  const { settings } = useSettings();

  const confirmDelete = useCallback(
    (message = "Are you sure you want to delete this item?") => {
      if (!settings.preferences.confirmBeforeDelete) {
        return true;
      }

      return window.confirm(message);
    },
    [settings.preferences.confirmBeforeDelete],
  );

  return { confirmDelete };
}
