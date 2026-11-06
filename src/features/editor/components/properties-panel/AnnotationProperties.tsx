import type {
  Annotation,
  AnnotationStyle,
  AnnotationUpdate,
} from "../../domain/annotation.types";
import { PropertyCheckbox } from "../PropertyFields";
import { AppearanceSection } from "./AppearanceSection";
import { PositionSection } from "./PositionSection";
import { TypeSpecificFields } from "./TypeSpecificFields";
import { TypographySection } from "./TypographySection";

interface AnnotationPropertiesProps {
  annotation: Annotation;
  onUpdate: (update: AnnotationUpdate) => void;
  onPositionChange: (key: keyof Annotation["position"], value: number) => void;
}

export function AnnotationProperties({
  annotation,
  onUpdate,
  onPositionChange,
}: AnnotationPropertiesProps) {
  function updateStyle(style: Partial<AnnotationStyle>) {
    onUpdate({ type: annotation.type, changes: { style } } as AnnotationUpdate);
  }

  const hasTypography =
    annotation.type === "text" || annotation.type === "date";

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium">Annotation</h3>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">Type</span>
        <span className="text-xs font-medium capitalize">
          {annotation.type}
        </span>
      </div>

      <PropertyCheckbox
        label="Required field"
        checked={annotation.required}
        onChange={(required) =>
          onUpdate({
            type: annotation.type,
            changes: { required },
          } as AnnotationUpdate)
        }
      />

      <TypeSpecificFields annotation={annotation} onUpdate={onUpdate} />

      <AppearanceSection style={annotation.style} onStyleChange={updateStyle} />

      {hasTypography && (
        <TypographySection
          style={annotation.style}
          onStyleChange={updateStyle}
        />
      )}

      <PositionSection
        position={annotation.position}
        onPositionChange={onPositionChange}
      />
    </section>
  );
}
