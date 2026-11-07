"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Minus,
  Plus,
} from "lucide-react";

import type { Annotation } from "../../domain/annotation.types";
import { FONT_FAMILY_OPTIONS } from "../../utils/font-family-constants";

type Style = Annotation["style"];

export type FontOption = { label: string; value: string };

const TEXT_COLORS = ["#111827", "#1d4ed8", "#15803d", "#b91c1c", "#7c3aed"];
const FILL_COLORS = ["transparent", "#ffffff", "#fef9c3", "#dbeafe", "#dcfce7"];

const MIN_FONT = 8;
const MAX_FONT = 48;
const DEFAULT_FONT = 14;

function toHex(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

interface AnnotationStyleBarProps {
  annotation: Annotation;
  onChange: (changes: Partial<Style>) => void;
  fonts?: FontOption[];
  className?: string;
}

export function AnnotationStyleBar({
  annotation,
  onChange,
  fonts = FONT_FAMILY_OPTIONS,
  className = "",
}: AnnotationStyleBarProps) {
  const { style, type } = annotation;

  const hasText = type === "text" || type === "date";
  const hasTextColor = hasText || type === "checkbox";
  const hasFill = type !== "checkbox";

  const fontSize = style.fontSize ?? DEFAULT_FONT;
  const borderWidth = style.borderWidth ?? 1;

  return (
    <div
      role="group"
      aria-label="Annotation style"
      className={`flex items-center gap-4 overflow-x-auto p-2 ${className} z-14`}
    >
      {hasText && (
        <>
          <Field label="Font">
            <select
              value={style.fontFamily ?? ""}
              onChange={(event) =>
                onChange({ fontFamily: event.target.value || undefined })
              }
              className="h-9 rounded-lg border border-border bg-surface px-2 text-base text-text outline-none focus:border-brand pointer-coarse:h-11 sm:text-sm"
            >
              {fonts.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Size">
            <div className="flex items-center gap-1">
              <IconButton
                label="Smaller text"
                disabled={fontSize <= MIN_FONT}
                onClick={() => onChange({ fontSize: fontSize - 1 })}
              >
                <Minus size={14} />
              </IconButton>
              <span className="w-8 text-center text-sm tabular-nums text-text">
                {fontSize}
              </span>
              <IconButton
                label="Larger text"
                disabled={fontSize >= MAX_FONT}
                onClick={() => onChange({ fontSize: fontSize + 1 })}
              >
                <Plus size={14} />
              </IconButton>
            </div>
          </Field>

          <Field label="Align">
            <div className="flex items-center gap-1">
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                  ["justify", AlignJustify],
                ] as const
              ).map(([value, Icon]) => (
                <IconButton
                  key={value}
                  label={`Align ${value}`}
                  active={(style.textAlign ?? "left") === value}
                  onClick={() => onChange({ textAlign: value })}
                >
                  <Icon size={15} />
                </IconButton>
              ))}
            </div>
          </Field>
        </>
      )}

      {hasTextColor && (
        <Field label="Colour">
          <ColorRow
            colors={TEXT_COLORS}
            value={style.color ?? TEXT_COLORS[0]}
            customLabel="Custom text colour"
            onChange={(color) => onChange({ color })}
          />
        </Field>
      )}

      {hasFill && (
        <Field label="Fill">
          <ColorRow
            colors={FILL_COLORS}
            value={style.backgroundColor ?? "rgba(59,130,246,0.08)"}
            customLabel="Custom fill colour"
            onChange={(backgroundColor) => onChange({ backgroundColor })}
          />
        </Field>
      )}

      <Field label="Border">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((width) => (
            <IconButton
              key={width}
              label={width === 0 ? "No border" : `Border ${width}px`}
              active={borderWidth === width}
              onClick={() => onChange({ borderWidth: width })}
            >
              <span className="text-xs tabular-nums">{width}</span>
            </IconButton>
          ))}

          <input
            type="color"
            aria-label="Border colour"
            value={toHex(style.borderColor, "#3b82f6")}
            onChange={(event) => onChange({ borderColor: event.target.value })}
            className="ml-1 h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0 pointer-coarse:h-9 pointer-coarse:w-9"
          />
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function IconButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-30 pointer-coarse:h-10 pointer-coarse:min-w-10 ${
        active ? "bg-brand text-white" : "text-text hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function ColorRow({
  colors,
  value,
  customLabel,
  onChange,
}: {
  colors: string[];
  value: string;
  customLabel: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {colors.map((color) => {
        const active = value.toLowerCase() === color;

        return (
          <button
            key={color}
            type="button"
            aria-label={color === "transparent" ? "No fill" : color}
            aria-pressed={active}
            onClick={() => onChange(color)}
            style={
              color === "transparent"
                ? {
                    background:
                      "linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)",
                  }
                : { backgroundColor: color }
            }
            className={`h-6 w-6 shrink-0 rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand pointer-coarse:h-8 pointer-coarse:w-8 ${
              active ? "border-brand ring-2 ring-brand/40" : "border-border"
            }`}
          />
        );
      })}

      <input
        type="color"
        aria-label={customLabel}
        value={toHex(value, "#ffffff")}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0 pointer-coarse:h-9 pointer-coarse:w-9"
      />
    </div>
  );
}
