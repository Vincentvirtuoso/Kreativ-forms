import type {
  DocumentId,
  PageId,
} from "@/features/documents/domain/document.types";

export type AnnotationId = string;

export type AnnotationType = "text" | "checkbox" | "date" | "signature";

export interface AnnotationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textAlign?: "left" | "center" | "right";
}

export interface BaseAnnotation {
  id: AnnotationId;
  documentId: DocumentId;
  pageId: PageId;
  type: AnnotationType;
  position: AnnotationPosition;
  style: AnnotationStyle;
  required: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  value: string;
  placeholder?: string;
  multiline: boolean;
}

export interface CheckboxAnnotation extends BaseAnnotation {
  type: "checkbox";
  checked: boolean;
}

export interface DateAnnotation extends BaseAnnotation {
  type: "date";
  value: string;
  placeholder?: string;
  format: string;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: "signature";
  value: string | null;
  signerName?: string;
}

export type Annotation =
  | TextAnnotation
  | CheckboxAnnotation
  | DateAnnotation
  | SignatureAnnotation;

export type CreateAnnotationInput = Annotation extends infer T
  ? T extends Annotation
    ? Omit<T, "id" | "createdAt" | "updatedAt">
    : never
  : never;

export type UpdateAnnotationInput = Partial<
  Pick<Annotation, "position" | "style" | "required">
>;

export type AnnotationUpdate =
  | {
      type: "text";
      changes: Partial<
        Pick<
          TextAnnotation,
          | "value"
          | "placeholder"
          | "multiline"
          | "required"
          | "position"
          | "style"
        >
      >;
    }
  | {
      type: "date";
      changes: Partial<
        Pick<
          DateAnnotation,
          "value" | "placeholder" | "format" | "required" | "position" | "style"
        >
      >;
    }
  | {
      type: "checkbox";
      changes: Partial<
        Pick<CheckboxAnnotation, "checked" | "required" | "position" | "style">
      >;
    }
  | {
      type: "signature";
      changes: Partial<
        Pick<
          SignatureAnnotation,
          "value" | "signerName" | "required" | "position" | "style"
        >
      >;
    };
