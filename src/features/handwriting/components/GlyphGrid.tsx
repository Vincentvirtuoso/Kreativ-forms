"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import type { CapturedGlyph } from "../domain/handwriting.types";
import { GLYPH_GROUPS, TOTAL_GLYPHS } from "../utils/glyph-set";
import { ProgressBar } from "@/components/ui/progress-bar";

interface GlyphGridProps {
  glyphs: CapturedGlyph[];
  selectedCharacter: string;
  onSelect: (character: string) => void;
}

export function GlyphGrid({
  glyphs,
  selectedCharacter,
  onSelect,
}: GlyphGridProps) {
  const captured = useMemo(
    () => new Set(glyphs.map((glyph) => glyph.character)),
    [glyphs],
  );

  const totalCaptured = GLYPH_GROUPS.reduce(
    (total, group) =>
      total + group.characters.filter((c) => captured.has(c)).length,
    0,
  );

  return (
    <div className="space-y-6">
      <ProgressBar
        label="Overall progress"
        value={totalCaptured}
        max={TOTAL_GLYPHS}
        showValue
      />

      {GLYPH_GROUPS.map((group) => {
        const completed = group.characters.filter((character) =>
          captured.has(character),
        ).length;

        return (
          <section
            key={group.label}
            aria-label={group.label}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{group.label}</h3>

              <span
                className={cn(
                  "text-xs tabular-nums",
                  completed === group.characters.length
                    ? "font-medium text-success"
                    : "text-text-muted",
                )}
              >
                {completed}/{group.characters.length}
              </span>
            </div>

            {/* Equal-size cells that fill the row. A wrapping flex with
                flex-1 stretches the last row's buttons to odd widths. */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
              {group.characters.map((character) => (
                <GlyphButton
                  key={character}
                  character={character}
                  captured={captured.has(character)}
                  selected={selectedCharacter === character}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function GlyphButton({
  character,
  captured,
  selected,
  onSelect,
}: {
  character: string;
  captured: boolean;
  selected: boolean;
  onSelect: (character: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(character)}
      aria-pressed={selected}
      aria-label={`Capture ${character}${captured ? ", captured" : ""}`}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-lg border",
        "text-base font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
        selected
          ? "border-brand bg-brand text-white"
          : captured
            ? "border-success/40 bg-success/10 text-text hover:bg-success/15"
            : "border-border bg-surface text-text hover:bg-surface-raised",
      )}
    >
      {character}

      {captured && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full",
            selected ? "bg-white text-brand" : "bg-success text-white",
          )}
        >
          <Check size={9} strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
