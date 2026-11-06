"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  CapturedGlyph,
  GeneratedHandwritingFont,
  StrokePoint,
} from "../domain/handwriting.types";

import { GlyphDrawingPad } from "./GlyphDrawingPad";
import { GlyphGrid } from "./GlyphGrid";
import { FontPreview } from "./FontPreview";
import { GLYPH_ORDER, TOTAL_GLYPHS } from "../utils/glyph-set";

import { glyphProcessingService } from "../services/glyph-processing.service";
import { fontGenerationService } from "../services/font-generation.service";
import { Button, FormField, Input } from "@splenddev/kreativ-ui";
import { Alert } from "@/components/ui/alert";

interface HandwritingCaptureProps {
  initialGlyphs?: CapturedGlyph[];
  onGlyphsChange?: (glyphs: CapturedGlyph[]) => void;
}

export function HandwritingCapture({
  initialGlyphs = [],
  onGlyphsChange,
}: HandwritingCaptureProps) {
  const [glyphs, setGlyphs] = useState<CapturedGlyph[]>(initialGlyphs);
  const [selectedCharacter, setSelectedCharacter] = useState(GLYPH_ORDER[0]);
  const [fontName, setFontName] = useState("My Handwriting");
  const [generatedFont, setGeneratedFont] =
    useState<GeneratedHandwritingFont | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Any change to the glyphs makes a previously generated font stale.
  const commitGlyphs = useCallback(
    (nextGlyphs: CapturedGlyph[]) => {
      setGlyphs(nextGlyphs);
      setGeneratedFont(null);
      setGenerationError(null);
      onGlyphsChange?.(nextGlyphs);
    },
    [onGlyphsChange],
  );

  const selectedGlyph = useMemo(
    () => glyphs.find((glyph) => glyph.character === selectedCharacter),
    [glyphs, selectedCharacter],
  );

  const requiredCharacters = useMemo(
    () => glyphs.map((glyph) => glyph.character),
    [glyphs],
  );

  const updateStrokes = useCallback(
    (strokes: StrokePoint[][]) => {
      const exists = glyphs.some(
        (glyph) => glyph.character === selectedCharacter,
      );

      if (strokes.length === 0) {
        commitGlyphs(
          glyphs.filter((glyph) => glyph.character !== selectedCharacter),
        );
        return;
      }

      const updated: CapturedGlyph = { character: selectedCharacter, strokes };

      // Edit in place so the list keeps its order instead of re-appending
      // the glyph on every stroke.
      commitGlyphs(
        exists
          ? glyphs.map((glyph) =>
              glyph.character === selectedCharacter ? updated : glyph,
            )
          : [...glyphs, updated],
      );
    },
    [glyphs, selectedCharacter, commitGlyphs],
  );

  async function generateFont() {
    setGenerating(true);
    setGenerationError(null);

    // Let the loading state paint before the synchronous work blocks the thread.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );

    try {
      const processed = glyphs.map((glyph) =>
        glyphProcessingService.process(glyph),
      );

      setGeneratedFont(fontGenerationService.generate(fontName, processed));
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Font generation failed.",
      );
    } finally {
      setGenerating(false);
    }
  }

  // Steps through every character in grid order and wraps at the ends.
  function stepCharacter(direction: -1 | 1) {
    const index = GLYPH_ORDER.indexOf(selectedCharacter);
    const next = (index + direction + GLYPH_ORDER.length) % GLYPH_ORDER.length;

    setSelectedCharacter(GLYPH_ORDER[next]);
  }

  const canGenerate = glyphs.length > 0 && fontName.trim().length > 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-text-muted">Currently capturing</p>

              <h2
                aria-live="polite"
                className="mt-1 text-4xl font-semibold tracking-tight"
              >
                {selectedCharacter}
              </h2>
            </div>

            <span className="text-sm tabular-nums text-text-muted">
              {glyphs.length} of {TOTAL_GLYPHS} captured
            </span>
          </div>

          <GlyphDrawingPad
            key={selectedCharacter}
            strokes={selectedGlyph?.strokes ?? []}
            onChange={updateStrokes}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              color="neutral"
              onClick={() => stepCharacter(-1)}
            >
              Previous
            </Button>

            <Button type="button" onClick={() => stepCharacter(1)}>
              Next character
            </Button>
          </div>
        </section>

        <aside className="space-y-5">
          <FormField.Root>
            <FormField.Label>Font family name</FormField.Label>
            <FormField.Control>
              <Input
                variant="outline"
                className="rounded-lg"
                id="handwriting-font-name"
                value={fontName}
                onChange={(event) => {
                  setFontName(event.target.value);
                  setGeneratedFont(null);
                }}
                placeholder="My Handwriting"
              />
            </FormField.Control>
          </FormField.Root>

          <div className="space-y-2">
            <Button
              type="button"
              disabled={!canGenerate || generating}
              isLoading={generating}
              onClick={() => void generateFont()}
              fullWidth
              size="lg"
              typography=""
            >
              Generate handwriting font
            </Button>

            {!canGenerate && (
              <p className="text-xs text-text-muted">
                {glyphs.length === 0
                  ? "Capture at least one character to generate a font."
                  : "Enter a font family name."}
              </p>
            )}
          </div>

          {generationError && (
            <Alert
              title="Couldn't generate font"
              onDismiss={() => setGenerationError(null)}
            >
              {generationError}
            </Alert>
          )}

          <FontPreview
            font={generatedFont}
            requiredCharacters={requiredCharacters}
          />
        </aside>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Your characters</h3>
          <p className="text-xs text-text-muted">
            Select a character to capture or edit its handwriting.
          </p>
        </div>

        <GlyphGrid
          glyphs={glyphs}
          selectedCharacter={selectedCharacter}
          onSelect={setSelectedCharacter}
        />
      </section>
    </div>
  );
}
