import type { CapturedGlyph } from "./handwriting.types";

export type HandwritingProfileId = string;

export type HandwritingProfileStatus = "draft" | "ready";

export interface HandwritingProfile {
  id: HandwritingProfileId;
  name: string;
  status: HandwritingProfileStatus;

  /** Original captured strokes, retained for future editing. */
  glyphs: CapturedGlyph[];

  /** Generated TTF, stored as a Blob in IndexedDB. */
  fontBlob?: Blob;

  fontFormat: "ttf";
  glyphCount: number;

  createdAt: number;
  updatedAt: number;
}

export interface CreateHandwritingProfileInput {
  name: string;
}

export interface UpdateHandwritingProfileInput {
  name?: string;
  glyphs?: CapturedGlyph[];
  fontBlob?: Blob;
  status?: HandwritingProfileStatus;
}
