import type {
  Annotation,
  AnnotationUpdate,
} from "../../domain/annotation.types";
import { PropertyCheckbox, PropertyInput } from "../PropertyFields";

interface TypeSpecificFieldsProps {
  annotation: Annotation;
  onUpdate: (update: AnnotationUpdate) => void;
}

/** Fields that only exist for one annotation type. */
export function TypeSpecificFields({
  annotation,
  onUpdate,
}: TypeSpecificFieldsProps) {
  switch (annotation.type) {
    case "text":
      return (
        <>
          <PropertyInput
            label="Placeholder"
            value={annotation.placeholder ?? ""}
            onChange={(placeholder) =>
              onUpdate({ type: "text", changes: { placeholder } })
            }
          />
          <PropertyCheckbox
            label="Multiline"
            checked={annotation.multiline}
            onChange={(multiline) =>
              onUpdate({ type: "text", changes: { multiline } })
            }
          />
        </>
      );

    case "date":
      return (
        <>
          <PropertyInput
            label="Placeholder"
            value={annotation.placeholder ?? ""}
            onChange={(placeholder) =>
              onUpdate({ type: "date", changes: { placeholder } })
            }
          />
          <PropertyInput
            label="Date format"
            value={annotation.format}
            onChange={(format) =>
              onUpdate({ type: "date", changes: { format } })
            }
          />
        </>
      );

    case "checkbox":
      return (
        <PropertyCheckbox
          label="Checked"
          checked={annotation.checked}
          onChange={(checked) =>
            onUpdate({ type: "checkbox", changes: { checked } })
          }
        />
      );

    case "signature":
      return (
        <PropertyInput
          label="Signer name"
          value={annotation.signerName ?? ""}
          onChange={(signerName) =>
            onUpdate({ type: "signature", changes: { signerName } })
          }
        />
      );

    default:
      return null;
  }
}
