"use client";

import { useCallback, useEffect, useState } from "react";

/** What the workspace needs to show one document card. */
export type WorkspaceDocument = {
  id: string;
  name: string;
  /** Last modified, as a timestamp in ms. */
  updatedAt: number;
  pageCount: number;
};

/**
 * THE one place to connect real data.
 *
 * Read the user's locally stored documents from your document repository and
 * map each one to a WorkspaceDocument. Until this is filled in, the workspace
 * shows its empty state.
 */
async function loadDocuments(): Promise<WorkspaceDocument[]> {
  // TODO: e.g.
  // const repositories = getDocumentRepositories(<persistence>);
  // const documents = await repositories.documents.list();
  // return documents.map((doc) => ({
  //   id: doc.id,
  //   name: doc.name,
  //   updatedAt: ...,
  //   pageCount: ...,
  // }));
  return [];
}

export function useDocuments() {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    loadDocuments()
      .then((result) => {
        if (active) setDocuments(result);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load documents.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { documents, loading, error, reload };
}
