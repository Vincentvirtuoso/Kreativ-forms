import * as opentype from "opentype.js";

export interface FontValidationResult {
  valid: boolean;
  glyphCount: number;
  missingCharacters: string[];
  errors: string[];
}

export class FontValidationService {
  async validate(
    blob: Blob,
    requiredCharacters: string[],
  ): Promise<FontValidationResult> {
    const errors: string[] = [];
    const missingCharacters: string[] = [];

    let font: opentype.Font;

    try {
      font = opentype.parse(await blob.arrayBuffer());
    } catch {
      return {
        valid: false,
        glyphCount: 0,
        missingCharacters: requiredCharacters,
        errors: ["The generated file could not be parsed as a font."],
      };
    }

    for (const character of new Set(requiredCharacters)) {
      if (font.charToGlyphIndex(character) === 0) {
        missingCharacters.push(character);
      }
    }

    if (font.glyphs.length < 2) {
      errors.push("The font does not contain enough glyphs.");
    }

    if (missingCharacters.length) {
      errors.push(
        `${missingCharacters.length} requested characters are missing.`,
      );
    }

    return {
      valid: errors.length === 0,
      glyphCount: font.glyphs.length,
      missingCharacters,
      errors,
    };
  }
}

export const fontValidationService = new FontValidationService();
