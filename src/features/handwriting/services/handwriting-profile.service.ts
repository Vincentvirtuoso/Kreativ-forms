import type {
  HandwritingProfile,
  HandwritingProfileId,
} from "../domain/handwriting-profile.types";

import type {
  CapturedGlyph,
  GeneratedHandwritingFont,
} from "../domain/handwriting.types";

import type {
  CreateHandwritingProfileInput,
  UpdateHandwritingProfileInput,
} from "../domain/handwriting-profile.types";

import type { HandwritingProfileRepository } from "../repositories/handwriting-profile.repository";

import { glyphProcessingService } from "./glyph-processing.service";
import { fontGenerationService } from "./font-generation.service";
import { fontValidationService } from "./font-validation.service";
import { dexieDocumentStore } from "@/infrastructure/storage/browser/dexie-document.store";

export class HandwritingProfileService {
  constructor(private readonly repository: HandwritingProfileRepository) {}

  async createDraft(
    input: CreateHandwritingProfileInput,
  ): Promise<HandwritingProfile> {
    const name = input.name.trim();

    if (!name) {
      throw new Error("A profile name is required.");
    }

    const now = Date.now();

    const profile: HandwritingProfile = {
      id: crypto.randomUUID(),
      name,
      status: "draft",
      glyphs: [],
      fontFormat: "ttf",
      glyphCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.create(profile);

    return profile;
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: HandwritingProfileId) {
    return this.repository.getById(id);
  }

  async saveGlyphs(id: HandwritingProfileId, glyphs: CapturedGlyph[]) {
    this.validateGlyphCollection(glyphs);

    await this.repository.update(id, {
      glyphs,
      glyphCount: glyphs.length,
      status: "draft",
      fontBlob: undefined,
    });
  }

  async generateFont(
    id: HandwritingProfileId,
  ): Promise<GeneratedHandwritingFont> {
    const profile = await this.repository.getById(id);

    if (!profile) {
      throw new Error("Handwriting profile not found.");
    }

    if (!profile.glyphs.length) {
      throw new Error("Capture at least one character first.");
    }

    const processed = profile.glyphs.map((glyph) =>
      glyphProcessingService.process(glyph),
    );

    const font = fontGenerationService.generate(profile.name, processed);

    const requiredCharacters = profile.glyphs.map((glyph) => glyph.character);

    const validation = await fontValidationService.validate(
      font.blob,
      requiredCharacters,
    );

    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    await this.repository.update(id, {
      fontBlob: font.blob,
      status: "ready",
      glyphCount: profile.glyphs.length,
    });

    return font;
  }

  async update(
    id: HandwritingProfileId,
    changes: UpdateHandwritingProfileInput,
  ) {
    if (changes.name !== undefined && !changes.name.trim()) {
      throw new Error("A profile name is required.");
    }

    if (changes.glyphs) {
      this.validateGlyphCollection(changes.glyphs);
    }

   const shouldRegenerate =
     changes.glyphs !== undefined || changes.name !== undefined;

   await this.repository.update(id, {
     ...changes,
     ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
     ...(shouldRegenerate
       ? {
           ...(changes.glyphs !== undefined
             ? { glyphCount: changes.glyphs.length }
             : {}),
           fontBlob: undefined,
           status: "draft" as const,
         }
       : {}),
   });
  }

  async delete(id: HandwritingProfileId) {
    await this.repository.delete(id);
  }

  private validateGlyphCollection(glyphs: CapturedGlyph[]) {
    const seen = new Set<string>();

    for (const glyph of glyphs) {
      if (Array.from(glyph.character).length !== 1) {
        throw new Error(`Invalid character: "${glyph.character}".`);
      }

      if (seen.has(glyph.character)) {
        throw new Error(`Duplicate character: "${glyph.character}".`);
      }

      if (!glyph.strokes.length) {
        throw new Error(`Character "${glyph.character}" has no strokes.`);
      }

      seen.add(glyph.character);
    }
  }
}

export const handwritingProfileService = new HandwritingProfileService(
  dexieDocumentStore.handwritingProfiles,
);
