import type { AnnotationStyle } from "../../domain/annotation.types";
import { clamp } from "../../utils/annotation-overlay.utils";
import { FONT_FAMILY_OPTIONS } from "../../utils/font-family-constants";
import { PropertyInput, PropertySelect } from "../PropertyFields";

const FONT_WEIGHTS = [
  { value: "normal", label: "Regular" },
  { value: "bold", label: "Bold" },
] as const;

const TEXT_ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

interface TypographySectionProps {
  style: AnnotationStyle;
  onStyleChange: (style: Partial<AnnotationStyle>) => void;
}

export function TypographySection({
  style,
  onStyleChange,
}: TypographySectionProps) {
  return (
    <div className="border-t border-border pt-4">
      <h4 className="mb-3 text-xs font-medium text-text-muted">Typography</h4>

      <div className="space-y-3">
        <PropertySelect
          label="Font family"
          value={style.fontFamily ?? "inherit"}
          onChange={(fontFamily) => onStyleChange({ fontFamily })}
          options={FONT_FAMILY_OPTIONS}
        />

        <PropertyInput
          label="Font size"
          type="number"
          min={1}
          max={120}
          value={String(style.fontSize ?? 14)}
          onChange={(value) =>
            onStyleChange({ fontSize: clamp(Number(value) || 1, 1, 120) })
          }
        />

        <PropertyInput
          label="Text color"
          type="color"
          value={style.color ?? "#000000"}
          onChange={(color) => onStyleChange({ color })}
        />

        <PropertySelect
          label="Font weight"
          value={style.fontWeight ?? "normal"}
          options={FONT_WEIGHTS}
          onChange={(fontWeight) => onStyleChange({ fontWeight })}
        />

        <PropertySelect
          label="Text alignment"
          value={style.textAlign ?? "left"}
          options={TEXT_ALIGNMENTS}
          onChange={(textAlign) => onStyleChange({ textAlign })}
        />
      </div>
    </div>
  );
}
