"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDocumentRepositories } from "@/features/documents/document-repository.factory";
import {
  DashboardDocumentService,
  type DashboardDocument,
} from "../services/dashboard-document.service";

export type WorkspaceDocument = DashboardDocument;

export function useDocuments() {
  const service = useMemo(
    () =>
      new DashboardDocumentService(
        getDocumentRepositories("local").documents,
        getDocumentRepositories("session").documents,
      ),
    [],
  );

  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [trash, setTrash] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [activeDocuments, trashedDocuments] = await Promise.all([
        service.getAll(),
        service.getTrash(),
      ]);

      setDocuments(activeDocuments);
      setTrash(trashedDocuments);
    } catch {
      setError("Unable to load your documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [activeDocuments, trashedDocuments] = await Promise.all([
          service.getAll(),
          service.getTrash(),
        ]);

        if (active) {
          setDocuments(activeDocuments);
          setTrash(trashedDocuments);
          setError(null);
        }
      } catch {
        if (active) {
          setError("Unable to load your documents. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [service]);

  const moveToTrash = useCallback(
    async (id: string) => {
      await service.moveToTrash(id);
      await reload();
    },
    [service, reload],
  );

  const restore = useCallback(
    async (id: string) => {
      await service.restore(id);
      await reload();
    },
    [service, reload],
  );

  const permanentlyDelete = useCallback(
    async (id: string) => {
      await service.permanentlyDelete(id);
      await reload();
    },
    [service, reload],
  );

  return {
    documents,
    trash,
    loading,
    error,
    reload,
    moveToTrash,
    restore,
    permanentlyDelete,
  };
}
