"use client";

import { useEffect, useState } from "react";

import type { GeneratedHandwritingFont } from "../domain/handwriting.types";

import {
  fontValidationService,
  type FontValidationResult,
} from "../services/font-validation.service";
import { FormField, Textarea } from "@splenddev/kreativ-ui";
import { Alert } from "@/components/ui/alert";

interface FontPreviewProps {
  font: GeneratedHandwritingFont | null;
  requiredCharacters: string[];
}

type PreviewState = "idle" | "loading" | "ready" | "error";

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog.";

export function FontPreview({ font, requiredCharacters }: FontPreviewProps) {
  const [state, setState] = useState<PreviewState>("idle");
  const [fontFamily, setFontFamily] = useState("");
  const [sample, setSample] = useState(SAMPLE_TEXT);
  const [validation, setValidation] = useState<FontValidationResult | null>(
    null,
  );

  useEffect(() => {
    if (!font) {
      setState("idle");
      setValidation(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    let fontFace: FontFace | null = null;

    async function loadFont() {
      setState("loading");
      setValidation(null);

      try {
        const result = await fontValidationService.validate(
          font!.blob,
          requiredCharacters,
        );

        if (cancelled) return;

        setValidation(result);

        if (
          result.errors.some((error) => error.includes("could not be parsed"))
        ) {
          throw new Error("Invalid TTF font.");
        }

        objectUrl = URL.createObjectURL(font!.blob);

        fontFace = new FontFace(font!.name, `url("${objectUrl}")`);

        await fontFace.load();

        if (cancelled) return;

        document.fonts.add(fontFace);
        setFontFamily(font!.name);
        setState("ready");
      } catch (error) {
        if (!cancelled) {
          console.error("Font preview failed:", error);
          setState("error");
        }
      }
    }

    void loadFont();

    return () => {
      cancelled = true;

      if (fontFace) {
        document.fonts.delete(fontFace);
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [font, requiredCharacters]);

  if (!font) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-text-muted text-center">
        Generate a handwriting font to preview it here.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{font.name}</h3>

        <span className="text-xs text-text-muted">
          {state === "loading" && "Loading font…"}
          {state === "ready" && "Browser preview ready"}
          {state === "error" && "Preview failed"}
        </span>
      </div>

      {validation && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p>{validation.glyphCount} glyphs detected</p>

          {validation.missingCharacters.length > 0 && (
            <p className="mt-2 text-amber-600">
              Missing: {validation.missingCharacters.join(" ")}
            </p>
          )}

          {validation.errors.map((error) => (
            <Alert key={error}>
              {error}
            </Alert>
          ))}
        </div>
      )}

      <FormField>
        <FormField.Label>Preview Text</FormField.Label>
        <FormField.Control>
          <Textarea
            value={sample}
            onChange={(event) => setSample(event.target.value)}
            rows={3}
          />
        </FormField.Control>
      </FormField>


      <div className="min-h-40 rounded-xl border border-border bg-white p-6">
        {state === "ready" ? (
          <p
            className="whitespace-pre-wrap wrap-break-word text-3xl text-black"
            style={{ fontFamily: `"${fontFamily}", sans-serif` }}
          >
            {sample}
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            {state === "error"
              ? "The font could not be loaded."
              : "Preparing preview…"}
          </p>
        )}
      </div>
    </section>
  );
}
