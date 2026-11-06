import type { AnnotationStyle } from "../../domain/annotation.types";
import { clamp } from "../../utils/annotation-overlay.utils";
import { PropertyInput, PropertySelect } from "../PropertyFields";

const BORDER_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

interface AppearanceSectionProps {
  style: AnnotationStyle;
  onStyleChange: (style: Partial<AnnotationStyle>) => void;
}

export function AppearanceSection({
  style,
  onStyleChange,
}: AppearanceSectionProps) {
  return (
    <div className="border-t border-border pt-4">
      <h4 className="mb-3 text-xs font-medium text-text-muted">Appearance</h4>

      <div className="space-y-3">
        <PropertyInput
          label="Stroke color"
          type="color"
          value={style.borderColor ?? "#000000"}
          onChange={(borderColor) => onStyleChange({ borderColor })}
        />

        <PropertyInput
          label="Stroke width"
          type="number"
          min={0}
          max={20}
          value={String(style.borderWidth ?? 0)}
          onChange={(value) =>
            onStyleChange({ borderWidth: clamp(Number(value) || 0, 0, 20) })
          }
        />

        <PropertyInput
          label="Fill color"
          type="color"
          value={style.backgroundColor ?? "#ffffff"}
          onChange={(backgroundColor) => onStyleChange({ backgroundColor })}
        />

        <PropertyInput
          label="Border radius"
          type="number"
          min={0}
          max={40}
          value={String(style.borderRadius ?? 0)}
          onChange={(value) =>
            onStyleChange({ borderRadius: clamp(Number(value) || 0, 0, 40) })
          }
        />

        <PropertyInput
          label="Opacity"
          type="number"
          min={0}
          max={1}
          value={String(style.opacity ?? 1)}
          onChange={(value) =>
            onStyleChange({ opacity: clamp(Number(value) || 0, 0, 1) })
          }
        />

        <PropertySelect
          label="Border style"
          value={style.borderStyle ?? "solid"}
          options={BORDER_STYLES}
          onChange={(borderStyle) => onStyleChange({ borderStyle })}
        />
      </div>
    </div>
  );
}
