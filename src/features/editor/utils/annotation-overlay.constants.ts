import { ANNOTATION_RULES } from "../domain/annotation.rules";
import type { Annotation } from "../domain/annotation.types";

export const MIN_WIDTH = ANNOTATION_RULES.minWidth;
export const MIN_HEIGHT = ANNOTATION_RULES.minHeight;
export const BASE_FONT_SIZE = 14;
export const KEY_STEP = 1;
export const KEY_STEP_LARGE = 5;

export const DOUBLE_TAP_MS = 350;
export const DOUBLE_TAP_DISTANCE = 28;

export type AnnotationType = Annotation["type"];

export const DEFAULT_TYPE: AnnotationType = "text";

export const DEFAULT_SIZE: Record<
  AnnotationType,
  { width: number; height: number }
> = {
  text: { width: 30, height: 12 },
  date: { width: 25, height: 12 },
  checkbox: { width: 12, height: 12 },
  signature: { width: 35, height: 12 },
};

export const TYPE_OPTIONS: { type: AnnotationType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "date", label: "Date" },
  { type: "checkbox", label: "Checkbox" },
  { type: "signature", label: "Signature" },
];
