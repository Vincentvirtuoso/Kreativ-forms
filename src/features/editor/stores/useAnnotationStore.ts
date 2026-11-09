import { create } from "zustand";

import type {
  Annotation,
  AnnotationId,
  AnnotationPosition,
  AnnotationStyle,
  AnnotationUpdate,
} from "../domain/annotation.types";

const HISTORY_LIMIT = 50;

interface HistoryGroup {
  baseline: Annotation[];
  depth: number;
}

interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotationId: AnnotationId | null;

  past: Annotation[][];
  future: Annotation[][];
  historyGroup: HistoryGroup | null;

  canUndo: boolean;
  canRedo: boolean;

  setAnnotations: (annotations: Annotation[]) => void;
  selectAnnotation: (id: AnnotationId | null) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: AnnotationId, update: AnnotationUpdate) => void;
  updatePosition: (id: AnnotationId, position: AnnotationPosition) => void;
  updateStyle: (id: AnnotationId, style: Partial<AnnotationStyle>) => void;
  removeAnnotation: (id: AnnotationId) => void;
  clearAnnotations: () => void;
  replaceAnnotation: (annotation: Annotation) => void;

  beginHistoryGroup: () => void;
  endHistoryGroup: () => void;
  resetHistory: () => void;

  undo: () => void;
  redo: () => void;
}

function sameAnnotations(a: Annotation[], b: Annotation[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function recordHistory(
  state: AnnotationState,
  annotations: Annotation[],
  previous = state.annotations,
): Partial<AnnotationState> {
  if (sameAnnotations(previous, annotations)) {
    return {};
  }

  const past = [...state.past, previous].slice(-HISTORY_LIMIT);

  return {
    annotations,
    past,
    future: [],
    canUndo: true,
    canRedo: false,
  };
}

function commitAnnotations(
  state: AnnotationState,
  annotations: Annotation[],
): Partial<AnnotationState> {
  if (state.historyGroup) {
    if (sameAnnotations(state.annotations, annotations)) {
      return {};
    }

    return {
      annotations,
      canUndo:
        state.past.length > 0 ||
        !sameAnnotations(state.historyGroup.baseline, annotations),
      canRedo: false,
    };
  }

  return recordHistory(state, annotations);
}

function getChangedAnnotationId(
  current: Annotation[],
  next: Annotation[],
): AnnotationId | null {
  const currentMap = new Map(current.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));

  const changedIds = new Set<AnnotationId>();

  for (const item of current) {
    const nextItem = nextMap.get(item.id);

    if (!nextItem || !sameAnnotations([item], [nextItem])) {
      changedIds.add(item.id);
    }
  }

  for (const item of next) {
    const currentItem = currentMap.get(item.id);

    if (!currentItem || !sameAnnotations([item], [currentItem])) {
      changedIds.add(item.id);
    }
  }

  return changedIds.size === 1 ? [...changedIds][0] : null;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  selectedAnnotationId: null,

  past: [],
  future: [],
  historyGroup: null,

  canUndo: false,
  canRedo: false,

  setAnnotations: (annotations) =>
    set({
      annotations,
      selectedAnnotationId: null,
      past: [],
      future: [],
      historyGroup: null,
      canUndo: false,
      canRedo: false,
    }),

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  addAnnotation: (annotation) =>
    set((state) => {
      if (state.annotations.some((item) => item.id === annotation.id)) {
        return state;
      }

      return {
        ...commitAnnotations(state, [...state.annotations, annotation]),
        selectedAnnotationId: annotation.id,
      };
    }),

  replaceAnnotation: (annotation) =>
    set((state) => {
      const exists = state.annotations.some(
        (item) => item.id === annotation.id,
      );

      if (!exists) return state;

      const annotations = state.annotations.map((item) =>
        item.id === annotation.id ? annotation : item,
      );

      return commitAnnotations(state, annotations);
    }),

  updateAnnotation: (id, update) =>
    set((state) => {
      const current = state.annotations.find((item) => item.id === id);

      if (!current || current.type !== update.type) return state;

      const annotations = state.annotations.map((annotation) => {
        if (annotation.id !== id) return annotation;

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
      });

      return commitAnnotations(state, annotations);
    }),

  updatePosition: (id, position) =>
    set((state) => {
      const current = state.annotations.find((item) => item.id === id);

      if (!current || sameAnnotations([current], [{ ...current, position }])) {
        return state;
      }

      const annotations = state.annotations.map((annotation) =>
        annotation.id === id
          ? {
              ...annotation,
              position,
              updatedAt: new Date().toISOString(),
            }
          : annotation,
      );

      if (!Number.isFinite(position.rotation)) {
        console.error("Invalid rotation passed to updatePosition:", {
          id,
          position,
        });
        console.trace();
      }

      return commitAnnotations(state, annotations);
    }),

  updateStyle: (id, style) =>
    set((state) => {
      const current = state.annotations.find((item) => item.id === id);

      if (!current) return state;

      const nextStyle = { ...current.style, ...style };

      if (JSON.stringify(current.style) === JSON.stringify(nextStyle)) {
        return state;
      }

      const annotations = state.annotations.map((annotation) =>
        annotation.id === id
          ? {
              ...annotation,
              style: nextStyle,
              updatedAt: new Date().toISOString(),
            }
          : annotation,
      );

      return commitAnnotations(state, annotations);
    }),

  removeAnnotation: (id) =>
    set((state) => {
      const annotations = state.annotations.filter((item) => item.id !== id);

      if (annotations.length === state.annotations.length) {
        return state;
      }

      return {
        ...commitAnnotations(state, annotations),
        selectedAnnotationId:
          state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
      };
    }),

  clearAnnotations: () =>
    set({
      annotations: [],
      selectedAnnotationId: null,
      past: [],
      future: [],
      historyGroup: null,
      canUndo: false,
      canRedo: false,
    }),

  beginHistoryGroup: () =>
    set((state) => ({
      historyGroup: state.historyGroup
        ? {
            ...state.historyGroup,
            depth: state.historyGroup.depth + 1,
          }
        : {
            baseline: state.annotations,
            depth: 1,
          },
    })),

  endHistoryGroup: () =>
    set((state) => {
      if (!state.historyGroup) return state;

      if (state.historyGroup.depth > 1) {
        return {
          historyGroup: {
            ...state.historyGroup,
            depth: state.historyGroup.depth - 1,
          },
        };
      }

      const baseline = state.historyGroup.baseline;

      return {
        ...recordHistory(state, state.annotations, baseline),
        historyGroup: null,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.historyGroup) {
        const baseline = state.historyGroup.baseline;

        if (sameAnnotations(baseline, state.annotations)) {
          return state;
        }

        const restoredId = getChangedAnnotationId(state.annotations, baseline);

        return {
          annotations: baseline,
          historyGroup: null,
          future: [...state.future, state.annotations],
          selectedAnnotationId: restoredId,
          canUndo: state.past.length > 0,
          canRedo: true,
        };
      }

      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];

      const restoredId = getChangedAnnotationId(state.annotations, previous);

      return {
        annotations: previous,
        past: state.past.slice(0, -1),
        future: [...state.future, state.annotations],
        selectedAnnotationId: restoredId,
        canUndo: state.past.length > 1,
        canRedo: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyGroup || state.future.length === 0) {
        return state;
      }

      const next = state.future[state.future.length - 1];

      const restoredId = getChangedAnnotationId(state.annotations, next);

      return {
        annotations: next,
        past: [...state.past, state.annotations].slice(-HISTORY_LIMIT),
        future: state.future.slice(0, -1),
        selectedAnnotationId: restoredId,
        canUndo: true,
        canRedo: state.future.length > 1,
      };
    }),

  resetHistory: () =>
    set({
      past: [],
      future: [],
      historyGroup: null,
      canUndo: false,
      canRedo: false,
    }),
}));
