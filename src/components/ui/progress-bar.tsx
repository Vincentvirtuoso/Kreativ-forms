"use client";

import { forwardRef, type ReactNode } from "react";

type ProgressBarSize = "sm" | "md" | "lg";
type ProgressBarVariant =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "destructive";

export interface ProgressBarProps {
  /** Current value. Leave undefined (or pass `indeterminate`) for a loading state. */
  value?: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  /** Bar thickness. Defaults to "md". */
  size?: ProgressBarSize;
  /** Fill color. Defaults to "brand". */
  variant?: ProgressBarVariant;
  /** Optional text label above the bar. */
  label?: ReactNode;
  /** Show the numeric percentage next to the label. */
  showValue?: boolean;
  /** Force the indeterminate (loading) animation. */
  indeterminate?: boolean;
  /** Accessible name (auto-derived from `label` if it's a string). */
  ariaLabel?: string;
  className?: string;
}

const trackSize: Record<ProgressBarSize, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2.5",
};

const labelSize: Record<ProgressBarSize, string> = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
};

const fillVariant: Record<ProgressBarVariant, string> = {
  brand: "bg-brand",
  neutral: "bg-text-muted",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  function ProgressBar(
    {
      value,
      max = 100,
      size = "md",
      variant = "brand",
      label,
      showValue = false,
      indeterminate,
      ariaLabel,
      className = "",
    },
    ref,
  ) {
    const isIndeterminate = indeterminate ?? value === undefined;
    const clamped = isIndeterminate
      ? 0
      : Math.min(Math.max(value ?? 0, 0), max);
    const percent = max > 0 ? (clamped / max) * 100 : 0;
    const hasHeader = Boolean(label) || showValue;

    return (
      <div ref={ref} className={`w-full ${className}`}>
        {hasHeader && (
          <div
            className={`mb-1.5 flex items-baseline justify-between gap-2 ${labelSize[size]}`}
          >
            <span className="truncate font-medium text-text">{label}</span>
            {showValue && (
              <span className="shrink-0 tabular-nums text-text-muted">
                {Math.round(percent)}%
              </span>
            )}
          </div>
        )}

        <div
          role="progressbar"
          aria-label={
            ariaLabel ?? (typeof label === "string" ? label : "Progress")
          }
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={isIndeterminate ? undefined : clamped}
          aria-valuetext={
            isIndeterminate ? undefined : `${Math.round(percent)}%`
          }
          className={`relative w-full overflow-hidden rounded-full bg-surface-raised ${trackSize[size]}`}
        >
          {isIndeterminate ? (
            <div
              className={`absolute inset-y-0 w-1/3 rounded-full ${fillVariant[variant]} animate-[kcp-progress-indeterminate_1.4s_ease-in-out_infinite]`}
            />
          ) : (
            <div
              className={`h-full rounded-full transition-[width] duration-300 ease-out ${fillVariant[variant]}`}
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
      </div>
    );
  },
);
