
export interface EditorInteractionSettings {
  snappingEnabled: boolean;

  snapToAnnotations: boolean;
  snapToPage: boolean;
  snapToGuides: boolean;

  moveStep: number;
  resizeStep: number;
  rotationStep: number;
}

export const DEFAULT_INTERACTION_SETTINGS: EditorInteractionSettings = {
  snappingEnabled: true,

  snapToAnnotations: true,
  snapToPage: true,
  snapToGuides: true,

  moveStep: 1,
  resizeStep: 1,
  rotationStep: 1,
};
