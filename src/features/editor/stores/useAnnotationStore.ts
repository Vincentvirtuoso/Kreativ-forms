import { create } from "zustand";

import type {
  Annotation,
  AnnotationId,
  AnnotationPosition,
  AnnotationStyle,
  AnnotationUpdate,
} from "../domain/annotation.types";

interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotationId: AnnotationId | null;

  setAnnotations: (annotations: Annotation[]) => void;
  selectAnnotation: (id: AnnotationId | null) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: AnnotationId, update: AnnotationUpdate) => void;
  updatePosition: (id: AnnotationId, position: AnnotationPosition) => void;
  updateStyle: (id: AnnotationId, style: Partial<AnnotationStyle>) => void;
  removeAnnotation: (id: AnnotationId) => void;
  clearAnnotations: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  selectedAnnotationId: null,

  setAnnotations: (annotations) =>
    set({ annotations, selectedAnnotationId: null }),

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  addAnnotation: (annotation) =>
    set((state) => {
      if (state.annotations.some((item) => item.id === annotation.id)) {
        return state;
      }

      return {
        annotations: [...state.annotations, annotation],
        selectedAnnotationId: annotation.id,
      };
    }),

  updateAnnotation: (id, update) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) => {
        if (annotation.id !== id || annotation.type !== update.type) {
          return annotation;
        }

        return {
          ...annotation,
          ...update.changes,
          position: update.changes.position
            ? { ...annotation.position, ...update.changes.position }
            : annotation.position,
          style: update.changes.style
            ? { ...annotation.style, ...update.changes.style }
            : annotation.style,
          updatedAt: new Date().toISOString(),
        } as Annotation;
      }),
    })),

  updatePosition: (id, position) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) =>
        annotation.id === id
          ? {
              ...annotation,
              position,
              updatedAt: new Date().toISOString(),
            }
          : annotation,
      ),
    })),

  updateStyle: (id, style) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) =>
        annotation.id === id
          ? {
              ...annotation,
              style: { ...annotation.style, ...style },
              updatedAt: new Date().toISOString(),
            }
          : annotation,
      ),
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((item) => item.id !== id),
      selectedAnnotationId:
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),
}));
