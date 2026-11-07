"use client";

import { useCallback } from "react";

import type {
  Annotation,
  AnnotationPosition,
} from "../domain/annotation.types";

import {
  KEY_STEP,
  KEY_STEP_LARGE,
} from "../utils/annotation-overlay.constants";

import {
  computePosition,
  positionsEqual,
  createPositionUpdate,
} from "../utils/annotation-overlay.utils";

interface UseAnnotationTransformProps {
  onUpdate: (
    id: string,
    update: import("../domain/annotation.types").AnnotationUpdate,
  ) => void;
  updatePosition: (id: string, position: AnnotationPosition) => void;
}

export function useAnnotationTransform({
  onUpdate,
  updatePosition,
}: UseAnnotationTransformProps) {
  const move = useCallback(
    (annotation: Annotation, dx: number, dy: number) => {
      const next = computePosition("move", annotation.position, dx, dy);

      if (positionsEqual(next, annotation.position)) return;

      updatePosition(annotation.id, next);
      onUpdate(annotation.id, createPositionUpdate(annotation, next));
    },
    [onUpdate, updatePosition],
  );

  const resize = useCallback(
    (annotation: Annotation, dx: number, dy: number) => {
      const next = computePosition("resize", annotation.position, dx, dy);

      if (positionsEqual(next, annotation.position)) return;

      updatePosition(annotation.id, next);
      onUpdate(annotation.id, createPositionUpdate(annotation, next));
    },
    [onUpdate, updatePosition],
  );

  const nudge = useCallback(
    (annotation: Annotation, direction: [number, number], large = false) => {
      const step = large ? KEY_STEP_LARGE : KEY_STEP;

      move(annotation, direction[0] * step, direction[1] * step);
    },
    [move],
  );

  return {
    move,
    resize,
    nudge,
  };
}
