"use client";

import { useDocuments } from "../hooks/useDocuments";


// Move the existing overview implementation here.
// Keep the document summary and recent-document sections.
export function OverviewView() {
  const { documents, loading, error, reload } = useDocuments();

  // Existing overview UI goes here.
  // Use documents, loading, error and reload.
  return <div>{/* Overview content */}</div>;
}
