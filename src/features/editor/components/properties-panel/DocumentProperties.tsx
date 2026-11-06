import type {
  Document,
  DocumentPage,
  StoredDocumentAsset,
} from "@/features/documents/domain/document.types";
import { formatBytes } from "@/lib/format-bytes";
import { Property } from "../PropertyFields";

interface DocumentPropertiesProps {
  document: Document;
  orderedPages: DocumentPage[];
  selectedPage: number;
  activePage: DocumentPage | undefined;
  workingPdf: StoredDocumentAsset;
}

export function DocumentProperties({
  document,
  orderedPages,
  selectedPage,
  activePage,
  workingPdf,
}: DocumentPropertiesProps) {
  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Document</h3>

        <Property label="Name" value={document.name} />
        <Property label="Status" value={document.status.replace("_", " ")} />
        <Property label="Pages" value={String(orderedPages.length)} />
        <Property label="File size" value={formatBytes(workingPdf.size)} />
      </section>

      {activePage && (
        <>
          <div className="border-t border-border" />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Selected page</h3>

            <Property label="Page" value={String(selectedPage)} />
            <Property
              label="Width"
              value={`${Math.round(activePage.width)} pt`}
            />
            <Property
              label="Height"
              value={`${Math.round(activePage.height)} pt`}
            />
            <Property label="Rotation" value={`${activePage.rotation}°`} />
          </section>
        </>
      )}
    </>
  );
}
