export type InteractionMode = "select" | "move" | "resize" | "rotate";

export interface AnnotationInteractionState {
  mode: InteractionMode;
  selectedId: string | null;
}
