"use client";

import { useCallback, useEffect } from "react";

interface UseDocumentSaveGuardOptions {
  hasUnsavedChanges: boolean;
  save: () => Promise<void>;
  onSaveError?: (error: unknown) => void;
}

export function useDocumentSaveGuard({
  hasUnsavedChanges,
  save,
  onSaveError,
}: UseDocumentSaveGuardOptions) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) return true;

    try {
      await save();
      return true;
    } catch (error) {
      onSaveError?.(error);
      return false;
    }
  }, [hasUnsavedChanges, save, onSaveError]);

  return { confirmNavigation };
}
