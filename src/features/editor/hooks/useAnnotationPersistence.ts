"use client";

import { useEffect, useMemo } from "react";

import { useAnnotationStore } from "../stores/useAnnotationStore";
import { AnnotationAutosaveController } from "../services/annotation-autosave.controller";
import type { AnnotationService } from "../services/annotation.service";

export function useAnnotationPersistence(service: AnnotationService) {
  const annotations = useAnnotationStore((state) => state.annotations);

  const autosave = useMemo(
    () => new AnnotationAutosaveController(service),
    [service],
  );

  useEffect(() => {
    return () => {
      void autosave.flushAll().catch(console.error);
    };
  }, [autosave]);

  return {
    annotations,
    autosave,
  };
}
