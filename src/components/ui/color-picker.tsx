"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface ColorPickerValue {
  hex: string;
  rgb: { r: number; g: number; b: number };
  alpha: number;
  rgba: string;
}

interface HSVColor {
  h: number;
  s: number;
  v: number;
  a: number;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: ColorPickerValue) => void;
  disabled?: boolean;
  /**
   * Whether to show the opacity slider and % field. Defaults to true.
   * Set to false when the consumer's value type can't represent alpha
   * (e.g. a plain 6-digit hex string) — otherwise dragging opacity
   * will appear to "not work", since every change gets discarded the
   * moment the opaque hex round-trips back in as `value`.
   */
  showAlpha?: boolean;
}

const DEFAULT_COLOR = "#0D99FF";

/* ------------------------------------------------------------------ */
/* Shared class strings – keeps the JSX readable                      */
/* ------------------------------------------------------------------ */

const THUMB_BASE =
  "absolute w-4 h-4 border-2 border-white rounded-full pointer-events-none " +
  "shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_1px_3px_rgba(0,0,0,0.35)] " +
  "-translate-x-1/2 -translate-y-1/2";

const CHECKER_BG =
  "bg-white bg-[length:8px_8px] bg-[position:0_0,4px_4px] " +
  "bg-[image:linear-gradient(45deg,#c8c8c8_25%,transparent_25%,transparent_75%,#c8c8c8_75%),linear-gradient(45deg,#c8c8c8_25%,transparent_25%,transparent_75%,#c8c8c8_75%)]";

const FIELD_BASE =
  "flex items-center gap-0.5 h-7 min-w-0 px-2 " +
  "border border-border rounded-[5px] bg-background text-xs tabular-nums " +
  "transition-[border-color,box-shadow] duration-[120ms] " +
  "focus-within:border-brand focus-within:ring-1 focus-within:ring-brand";

const SLIDER_FOCUS =
  "focus-visible:outline-2 focus-visible:[outline-style:solid] " +
  "focus-visible:outline-offset-2 focus-visible:outline-brand";

/* ------------------------------------------------------------------ */
/* Color math helpers                                                 */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hsvToRgb(h: number, s: number, v: number): RGBColor {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsv(r: number, g: number, b: number): Omit<HSVColor, "a"> {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function toHex(r: number, g: number, b: number) {
  return [r, g, b]
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function parseHexColor(input: string): HSVColor {
  const clean = input.trim().replace(/^#/, "");
  const normalized =
    clean.length === 3 || clean.length === 4
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[\da-fA-F]{6}([\da-fA-F]{2})?$/.test(normalized)) {
    return { ...rgbToHsv(13, 153, 255), a: 1 };
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const a =
    normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : 1;
  return { ...rgbToHsv(r, g, b), a };
}

function getColorValue(hsv: HSVColor): ColorPickerValue {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return {
    hex: `#${toHex(r, g, b)}`,
    rgb: { r, g, b },
    alpha: hsv.a,
    rgba: `rgba(${r}, ${g}, ${b}, ${Number(hsv.a.toFixed(3))})`,
  };
}

/* ------------------------------------------------------------------ */
/* Pointer-drag hook                                                  */
/* ------------------------------------------------------------------ */

function useDrag(
  onMove: (x: number, y: number) => void,
  disabled: boolean,
  onDragStart?: () => void,
  onDragEnd?: () => void,
) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const onMoveRef = useRef(onMove);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);

  onMoveRef.current = onMove;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  const handleMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    onMoveRef.current(x, y);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      active.current = true;
      onDragStartRef.current?.();
      event.currentTarget.setPointerCapture(event.pointerId);
      handleMove(event);
      event.preventDefault();
    },
    [disabled, handleMove],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (active.current) handleMove(event);
    },
    [handleMove],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active.current) return;
    active.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onDragEndRef.current?.();
  }, []);

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}

/* ------------------------------------------------------------------ */
/* EyeDropper typings                                                 */
/* ------------------------------------------------------------------ */

interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperInstance {
  open(): Promise<EyeDropperResult>;
}
interface EyeDropperConstructor {
  new (): EyeDropperInstance;
}
declare global {
  interface Window {
    EyeDropper?: EyeDropperConstructor;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function ColorPicker({
  value,
  defaultValue = DEFAULT_COLOR,
  onChange,
  disabled = false,
  showAlpha = true,
}: ColorPickerProps) {
  const isControlled = value !== undefined;

  const [hsv, setHsv] = useState<HSVColor>(() =>
    parseHexColor(value ?? defaultValue),
  );

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const isDragging = useRef(false);

  const [hexText, setHexText] = useState(() => {
    const initial = parseHexColor(value ?? defaultValue);
    const { r, g, b } = hsvToRgb(initial.h, initial.s, initial.v);
    return toHex(r, g, b);
  });

  const [alphaText, setAlphaText] = useState(() =>
    String(Math.round(parseHexColor(value ?? defaultValue).a * 100)),
  );

  const hexRef = useRef<HTMLInputElement>(null);
  const alphaRef = useRef<HTMLInputElement>(null);

  const color = getColorValue(hsv);
  const { r, g, b } = color.rgb;

  const updateColor = useCallback(
    (next: HSVColor) => {
      setHsv(next);
      onChange?.(getColorValue(next));
    },
    [onChange],
  );

  useEffect(() => {
    if (!isControlled || isDragging.current) return;
    const next = parseHexColor(value as string);
    const rgb = hsvToRgb(next.h, next.s, next.v);
    setHsv((prev) => ({ ...next, h: next.s > 0.001 ? next.h : prev.h }));
    if (document.activeElement !== hexRef.current) {
      setHexText(toHex(rgb.r, rgb.g, rgb.b));
    }
    if (document.activeElement !== alphaRef.current) {
      setAlphaText(String(Math.round(next.a * 100)));
    }
  }, [value, isControlled]);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    if (isControlled && value !== undefined) {
      const next = parseHexColor(value);
      setHsv((prev) => ({ ...next, h: next.s > 0.001 ? next.h : prev.h }));
    }
  }, [isControlled, value]);

  const svDrag = useDrag(
    (x, y) => updateColor({ ...hsvRef.current, s: x, v: 1 - y }),
    disabled,
    handleDragStart,
    handleDragEnd,
  );

  const hueDrag = useDrag(
    (x) => updateColor({ ...hsvRef.current, h: x * 360 }),
    disabled,
    handleDragStart,
    handleDragEnd,
  );

  const alphaDrag = useDrag(
    (x) => {
      updateColor({ ...hsvRef.current, a: x });
      setAlphaText(String(Math.round(x * 100)));
    },
    disabled,
    handleDragStart,
    handleDragEnd,
  );

  const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 6)
      .toUpperCase();
    setHexText(raw);
    if (raw.length !== 6) return;
    const next = parseHexColor(`#${raw}`);
    updateColor({
      ...next,
      h: next.s > 0.001 ? next.h : hsvRef.current.h,
      a: hsvRef.current.a,
    });
  };

  const handleHexBlur = () => setHexText(color.hex.slice(1));

  const handleAlphaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 3);
    setAlphaText(raw);
    if (!raw) return;
    const nextAlpha = clamp(Number(raw), 0, 100) / 100;
    updateColor({ ...hsvRef.current, a: nextAlpha });
  };

  const handleAlphaBlur = () => setAlphaText(String(Math.round(hsv.a * 100)));

  const handleEyedropper = async () => {
    if (!window.EyeDropper || disabled) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      const next = parseHexColor(sRGBHex);
      updateColor({
        ...next,
        h: next.s > 0.001 ? next.h : hsvRef.current.h,
        a: hsvRef.current.a,
      });
    } catch {
      /* user cancelled */
    }
  };

  const supportsEyedropper =
    typeof window !== "undefined" && "EyeDropper" in window;

  /* ---------- dynamic inline styles only ---------- */

  const hueColorStyle: CSSProperties = {
    backgroundColor: `hsl(${hsv.h} 100% 50%)`,
  };

  const hueThumbStyle: CSSProperties = {
    left: `${(hsv.h / 360) * 100}%`,
    backgroundColor: `hsl(${hsv.h} 100% 50%)`,
  };

  const alphaThumbStyle: CSSProperties = {
    left: `${hsv.a * 100}%`,
    backgroundColor: color.rgba,
  };

  return (
    <div
      data-disabled={disabled}
      className="flex flex-col gap-2.5 w-full min-w-0 text-text select-none font-[inherit] [-webkit-tap-highlight-color:transparent] data-[disabled=true]:opacity-[0.48] data-[disabled=true]:pointer-events-none"
    >
      {/* Saturation / Value */}
      <div
        ref={svDrag.ref}
        onPointerDown={svDrag.onPointerDown}
        onPointerMove={svDrag.onPointerMove}
        onPointerUp={svDrag.onPointerUp}
        onPointerCancel={svDrag.onPointerCancel}
        style={hueColorStyle}
        role="slider"
        aria-label="Color saturation and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        tabIndex={disabled ? -1 : 0}
        className={`relative w-full h-40 overflow-hidden rounded-md border border-border cursor-crosshair touch-none bg-[linear-gradient(to_top,#000,transparent),linear-gradient(to_right,#fff,transparent)] ${SLIDER_FOCUS}`}
      >
        <div
          className={THUMB_BASE}
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      {/* Hue + Alpha sliders */}
      <div className="grid gap-2.5">
        <div
          ref={hueDrag.ref}
          onPointerDown={hueDrag.onPointerDown}
          onPointerMove={hueDrag.onPointerMove}
          onPointerUp={hueDrag.onPointerUp}
          onPointerCancel={hueDrag.onPointerCancel}
          role="slider"
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          tabIndex={disabled ? -1 : 0}
          className={`relative h-3.5 cursor-pointer touch-none ${SLIDER_FOCUS}`}
        >
          <div className="absolute inset-x-0 top-0.5 bottom-0.5 overflow-hidden rounded-full bg-[linear-gradient(to_right,#f00_0%,#ff0_17%,#0f0_33%,#0ff_50%,#00f_67%,#f0f_83%,#f00_100%)]" />
          <div className={`${THUMB_BASE} top-1/2`} style={hueThumbStyle} />
        </div>

        {showAlpha && (
          <div
            ref={alphaDrag.ref}
            onPointerDown={alphaDrag.onPointerDown}
            onPointerMove={alphaDrag.onPointerMove}
            onPointerUp={alphaDrag.onPointerUp}
            onPointerCancel={alphaDrag.onPointerCancel}
            role="slider"
            aria-label="Opacity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.a * 100)}
            tabIndex={disabled ? -1 : 0}
            className={`relative h-3.5 cursor-pointer touch-none ${SLIDER_FOCUS}`}
          >
            <div
              className={`absolute inset-x-0 top-0.5 bottom-0.5 overflow-hidden rounded-full ${CHECKER_BG}`}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), ${color.hex})`,
                }}
              />
            </div>
            <div className={`${THUMB_BASE} top-1/2`} style={alphaThumbStyle} />
          </div>
        )}
      </div>

      {/* Bottom controls – Figma-style */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div
          className={`relative shrink-0 w-7 h-7 overflow-hidden border border-border rounded-[5px]${showAlpha ? " " + CHECKER_BG : ""}`}
        >
          <div
            className="absolute inset-0"
            style={{ background: showAlpha ? color.rgba : color.hex }}
          />
        </div>

        <label className={`${FIELD_BASE} flex-1`}>
          <span
            className="shrink-0 text-text-muted text-xs leading-none"
            aria-hidden="true"
          >
            #
          </span>
          <input
            ref={hexRef}
            value={hexText}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            maxLength={6}
            spellCheck={false}
            autoComplete="off"
            aria-label="HEX color"
            disabled={disabled}
            className="w-full min-w-0 p-0 border-0 outline-none bg-transparent text-inherit font-[inherit] tabular-nums tracking-[0.02em]"
          />
        </label>

        {showAlpha && (
          <label className={`${FIELD_BASE} shrink-0 basis-14`}>
            <input
              ref={alphaRef}
              value={alphaText}
              onChange={handleAlphaChange}
              onBlur={handleAlphaBlur}
              maxLength={3}
              inputMode="numeric"
              autoComplete="off"
              aria-label="Opacity percentage"
              disabled={disabled}
              className="w-full min-w-0 p-0 border-0 outline-none bg-transparent text-inherit font-[inherit] tabular-nums tracking-[0.02em]"
            />
            <span
              className="shrink-0 text-text-muted text-xs leading-none"
              aria-hidden="true"
            >
              %
            </span>
          </label>
        )}

        {supportsEyedropper && (
          <button
            type="button"
            onClick={handleEyedropper}
            disabled={disabled}
            title="Pick color from screen"
            aria-label="Pick color from screen"
            className="grid shrink-0 w-7 h-7 place-items-center p-0 border border-border rounded-[5px] bg-transparent text-inherit cursor-pointer transition-[background-color,border-color] duration-120 hover:enabled:bg-surface-muted focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand focus-visible:outline-none"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="m2 22 1-1h3l9-9" />
              <path d="M3 21v-3l9-9" />
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
