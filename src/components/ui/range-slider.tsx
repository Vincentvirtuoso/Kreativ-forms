"use client";

import { FormField } from "@splenddev/kreativ-ui";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type RangeSliderSize = "sm" | "md" | "lg";
export type RangeSliderValue = number | [number, number];

export interface RangeSliderProps<T extends RangeSliderValue = number> {
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  onValueCommit?: (value: T) => void;
  min?: number;
  max?: number;
  step?: number;
  minDistance?: number;
  size?: RangeSliderSize;
  disabled?: boolean;
  label?: string;
  formatValue?: (value: number) => string;
  className?: string;
  accent?: string;
}

const trackSize: Record<RangeSliderSize, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

const thumbSize: Record<RangeSliderSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const defaultFormat = (v: number) => String(v);

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function snap(n: number, step: number, min: number) {
  const steps = Math.round((n - min) / step);
  return min + steps * step;
}

function roundTo(n: number, step: number) {
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number(n.toFixed(decimals));
}

function isRangeValue(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2;
}

export function RangeSlider<T extends RangeSliderValue = number>({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  minDistance = 0,
  size = "md",
  disabled = false,
  label,
  formatValue = defaultFormat,
  className = "",
  accent,
}: RangeSliderProps<T>) {
  const isControlled = value !== undefined;

  const sample = isControlled ? value : defaultValue;
  const isRange = isRangeValue(sample);

  const [internal, setInternal] = useState<[number, number]>(() => {
    const init = defaultValue ?? value;
    if (isRangeValue(init)) return [init[0], init[1]];
    if (typeof init === "number") return [min, init];
    return [min, min];
  });

  let pairLow: number;
  let pairHigh: number;
  if (isControlled) {
    if (isRangeValue(value)) {
      pairLow = value[0];
      pairHigh = value[1];
    } else if (typeof value === "number") {
      pairLow = min;
      pairHigh = value;
    } else {
      pairLow = min;
      pairHigh = min;
    }
  } else {
    pairLow = internal[0];
    pairHigh = internal[1];
  }

  const trackRef = useRef<HTMLDivElement>(null);
  const activeThumb = useRef<0 | 1 | null>(null);
  const pointerId = useRef<number | null>(null);

  const lowPercent = ((pairLow - min) / (max - min)) * 100;
  const highPercent = ((pairHigh - min) / (max - min)) * 100;

  const emit = useCallback(
    (next: [number, number]) => {
      const payload = (isRange ? next : next[1]) as T;
      if (!isControlled) setInternal(next);
      onValueChange?.(payload);
    },
    [isControlled, isRange, onValueChange],
  );

  const emitFinal = useCallback(
    (next: [number, number]) => {
      const payload = (isRange ? next : next[1]) as T;
      onValueCommit?.(payload);
    },
    [isRange, onValueCommit],
  );

  const percentFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * 100;
  }, []);

  const valueFromPercent = useCallback(
    (percent: number) => {
      const raw = min + (percent / 100) * (max - min);
      return roundTo(clamp(snap(raw, step, min), min, max), step);
    },
    [min, max, step],
  );

  const resolvePair = useCallback(
    (index: 0 | 1, nextValue: number): [number, number] => {
      if (!isRange) {
        return [min, clamp(nextValue, min, max)];
      }
      if (index === 0) {
        return [Math.min(nextValue, pairHigh - minDistance), pairHigh];
      }
      return [pairLow, Math.max(nextValue, pairLow + minDistance)];
    },
    [isRange, min, max, pairLow, pairHigh, minDistance],
  );

  const beginDrag = useCallback(
    (index: 0 | 1, event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      activeThumb.current = index;
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [disabled],
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const percent = percentFromClientX(event.clientX);
      const clicked = valueFromPercent(percent);

      const index: 0 | 1 = isRange
        ? Math.abs(clicked - pairLow) <= Math.abs(clicked - pairHigh)
          ? 0
          : 1
        : 1;

      emit(resolvePair(index, clicked));

      event.preventDefault();
      activeThumb.current = index;
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [
      disabled,
      isRange,
      pairLow,
      pairHigh,
      percentFromClientX,
      valueFromPercent,
      resolvePair,
      emit,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeThumb.current === null) return;
      if (pointerId.current !== event.pointerId) return;

      const percent = percentFromClientX(event.clientX);
      const next = valueFromPercent(percent);
      emit(resolvePair(activeThumb.current, next));
    },
    [percentFromClientX, valueFromPercent, resolvePair, emit],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeThumb.current === null) return;
      if (pointerId.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      activeThumb.current = null;
      pointerId.current = null;
      emitFinal([pairLow, pairHigh]);
    },
    [pairLow, pairHigh, emitFinal],
  );

  const handleThumbKeyDown = useCallback(
    (index: 0 | 1, event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const bigStep = Math.max(step, (max - min) / 10);
      let delta = 0;
      let absolute: number | null = null;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowDown":
          delta = -step;
          break;
        case "ArrowRight":
        case "ArrowUp":
          delta = step;
          break;
        case "PageDown":
          delta = -bigStep;
          break;
        case "PageUp":
          delta = bigStep;
          break;
        case "Home":
          absolute = min;
          break;
        case "End":
          absolute = max;
          break;
        default:
          return;
      }

      event.preventDefault();

      const currentValue = index === 0 ? pairLow : pairHigh;
      const raw = absolute !== null ? absolute : currentValue + delta;
      const nextPair = resolvePair(index, roundTo(raw, step));

      if (nextPair[0] === pairLow && nextPair[1] === pairHigh) return;

      emit(nextPair);
      emitFinal(nextPair);
    },
    [disabled, step, min, max, pairLow, pairHigh, resolvePair, emit, emitFinal],
  );

  useEffect(() => {
    return () => {
      activeThumb.current = null;
      pointerId.current = null;
    };
  }, []);

  const thumbCommon = `absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${thumbSize[size]} rounded-full border-2 border-surface-raised bg-surface-raised shadow-[0_1px_2px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-100 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background`;

  const thumbInteractive = disabled
    ? "cursor-not-allowed"
    : "hover:scale-110 active:scale-115 cursor-grab";

  return (
    <div
      className={`w-full select-none ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative flex items-center ${trackSize[size]} my-3 ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        } touch-none`}
      >
        <div
          className={`absolute inset-x-0 ${trackSize[size]} rounded-full bg-surface-sunken`}
        />

        <div
          className={`absolute ${trackSize[size]} rounded-full`}
          style={{
            left: `${lowPercent}%`,
            width: `${Math.max(highPercent - lowPercent, 0)}%`,
            backgroundColor: accent ?? "rgb(var(--kui-colors-brand))",
          }}
        />

        {isRange ? (
          <>
            <div
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={label ? `${label} minimum` : "Minimum value"}
              aria-valuemin={min}
              aria-valuemax={pairHigh - minDistance}
              aria-valuenow={pairLow}
              aria-valuetext={formatValue(pairLow)}
              aria-disabled={disabled || undefined}
              onPointerDown={(event) => beginDrag(0, event)}
              onKeyDown={(event) => handleThumbKeyDown(0, event)}
              style={{ left: `${lowPercent}%` }}
              className={`${thumbCommon} ${thumbInteractive} z-10`}
            />

            <div
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={label ? `${label} maximum` : "Maximum value"}
              aria-valuemin={pairLow + minDistance}
              aria-valuemax={max}
              aria-valuenow={pairHigh}
              aria-valuetext={formatValue(pairHigh)}
              aria-disabled={disabled || undefined}
              onPointerDown={(event) => beginDrag(1, event)}
              onKeyDown={(event) => handleThumbKeyDown(1, event)}
              style={{ left: `${highPercent}%` }}
              className={`${thumbCommon} ${thumbInteractive} z-10`}
            />
          </>
        ) : (
          <div
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={label ?? "Value"}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={pairHigh}
            aria-valuetext={formatValue(pairHigh)}
            aria-disabled={disabled || undefined}
            onPointerDown={(event) => beginDrag(1, event)}
            onKeyDown={(event) => handleThumbKeyDown(1, event)}
            style={{ left: `${highPercent}%` }}
            className={`${thumbCommon} ${thumbInteractive} z-10`}
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-text-muted">
        <span>{formatValue(pairLow)}</span>
        <span>{formatValue(pairHigh)}</span>
      </div>
    </div>
  );
}

interface FormFieldRangeSliderProps extends RangeSliderProps {
  label: string;
}

export function FormFieldRangeSlider({
  label,
  ...sliderProps
}: FormFieldRangeSliderProps) {
  return (
    <FormField>
      <FormField.Label>{label}</FormField.Label>
      <FormField.Control>
        <RangeSlider {...sliderProps} />
      </FormField.Control>
    </FormField>
  );
}
