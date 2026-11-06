"use client";

import { Button } from "@splenddev/kreativ-ui";
import {
  MAX_PEN_SIZE,
  MIN_PEN_SIZE,
  sanitizeColor,
  type PenSettings,
} from "../../utils/signature-geometry";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  FormFieldRangeSlider,
  RangeSlider,
} from "@/components/ui/range-slider";

const PEN_COLORS = [
  { value: "#111827", label: "Black" },
  { value: "#1d4ed8", label: "Blue" },
  { value: "#dc2626", label: "Red" },
  { value: "#15803d", label: "Green" },
] as const;

interface PenControlsProps {
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  onRequestCustomColor: () => void;
}

/** Choose ink color and width. Applies to strokes drawn from now on. */
export function PenControls({
  pen,
  onChange,
  onRequestCustomColor,
}: PenControlsProps) {
  const isPreset = PEN_COLORS.some(
    (color) => color.value.toLowerCase() === pen.color.toLowerCase(),
  );

  return (
    <div className="flex flex-col gap-y-5">
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Ink color"
      >
        {PEN_COLORS.map((color) => {
          const selected =
            color.value.toLowerCase() === pen.color.toLowerCase();

          return (
            <button
              key={color.value}
              type="button"
              aria-label={color.label}
              aria-pressed={selected}
              title={color.label}
              onClick={() => onChange({ ...pen, color: color.value })}
              className={`size-6 rounded-full border border-border transition-shadow ${
                selected
                  ? "ring-2 ring-brand ring-offset-2 ring-offset-background"
                  : ""
              }`}
              style={{ backgroundColor: color.value }}
            />
          );
        })}

        <Button
          title="Custom color"
          onClick={onRequestCustomColor}
          variant="outline"
          iconOnly
          size="xs"
          style={{
            background: isPreset
              ? "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"
              : pen.color,
          }}
        >
          <span className="sr-only">Custom color</span>
        </Button>
      </div>
      <FormFieldRangeSlider
        label="Pen Width"
        min={MIN_PEN_SIZE}
        max={MAX_PEN_SIZE}
        step={0.5}
        value={pen.size}
        onValueChange={(value) => onChange({ ...pen, size: Number(value) })}
        aria-label="Pen width"
        accent={sanitizeColor(pen.color)}
      />
    </div>
  );
}
