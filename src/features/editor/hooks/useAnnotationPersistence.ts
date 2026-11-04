"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AnnotationService } from "../services/annotation.service";
import {
  AnnotationAutosaveController,
  type SaveStatus,
} from "../services/annotation-autosave.controller";

import type { DocumentId } from "@/features/documents/domain/document.types";

export function useAnnotationPersistence(
  service: AnnotationService,
  documentId: DocumentId,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const activeDocumentId = useRef(documentId);
  activeDocumentId.current = documentId;

  const autosave = useMemo(
    () =>
      new AnnotationAutosaveController(
        service,
        500,
        undefined,
        (status) => {
          if (activeDocumentId.current === documentId) {
            setSaveStatus(status);
          }
        },
      ),
    [service, documentId],
  );

  useEffect(() => {
    setSaveStatus("idle");
  }, [autosave]);

  return {
    autosave,
    saveStatus,
    retrySave: () => autosave.flushAll(),
  };
}
