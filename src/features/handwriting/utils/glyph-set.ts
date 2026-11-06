export interface GlyphGroup {
  label: string;
  characters: string[];
}

export const GLYPH_GROUPS: GlyphGroup[] = [
  {
    label: "Uppercase",
    characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  },
  {
    label: "Lowercase",
    characters: "abcdefghijklmnopqrstuvwxyz".split(""),
  },
  {
    label: "Numbers",
    characters: "0123456789".split(""),
  },
  {
    label: "Punctuation",
    characters: ".,!?;:'\"()-".split(""),
  },
];

export const GLYPH_ORDER = GLYPH_GROUPS.flatMap((group) => group.characters);

export const TOTAL_GLYPHS = GLYPH_ORDER.length;
