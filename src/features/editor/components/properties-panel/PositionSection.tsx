import type { Annotation } from "../../domain/annotation.types";
import { PropertyInput } from "../PropertyFields";

const POSITION_FIELDS = [
  ["X", "x"],
  ["Y", "y"],
  ["Width", "width"],
  ["Height", "height"],
] as const;

interface PositionSectionProps {
  position: Annotation["position"];
  onPositionChange: (key: keyof Annotation["position"], value: number) => void;
}

export function PositionSection({
  position,
  onPositionChange,
}: PositionSectionProps) {
  return (
    <div className="border-t border-border pt-4">
      <h4 className="mb-3 text-xs font-medium text-text-muted">
        Position and size
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {POSITION_FIELDS.map(([label, key]) => (
          <PropertyInput
            key={key}
            label={`${label} (%)`}
            type="number"
            min={0}
            max={100}
            value={String(position[key])}
            onChange={(value) => onPositionChange(key, Number(value))}
          />
        ))}
      </div>
    </div>
  );
}
