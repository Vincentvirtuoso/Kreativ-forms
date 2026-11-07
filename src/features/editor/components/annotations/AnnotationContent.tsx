"use client";

import type { Annotation } from "../../domain/annotation.types";

export function AnnotationContent({
  annotation,
  disabled,
  onChange,
  onRequestSign,
}: {
  annotation: Annotation;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
  onRequestSign: () => void;
}) {
  const controlClass =
    "h-full w-full min-w-0 border-0 bg-transparent px-1 text-inherit outline-none";

  const textAlign = annotation.style.textAlign ?? "right";

  const textStyle = {
    textAlign,
  } satisfies React.CSSProperties;

  switch (annotation.type) {
    case "text":
      return annotation.multiline ? (
        <textarea
          value={annotation.value}
          placeholder={annotation.placeholder ?? "Enter text"}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          style={textStyle}
          className={`${controlClass} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={annotation.value}
          placeholder={annotation.placeholder ?? "Enter text"}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          style={textStyle}
          className={controlClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={annotation.value}
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          style={textStyle}
          className={controlClass}
        />
      );

    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={annotation.checked}
          disabled={disabled}
          aria-label="Checkbox annotation"
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.checked)}
          className="mx-auto size-[1.15em] accent-brand"
        />
      );

    case "signature":
      return annotation.value ? (
        <img
          src={annotation.value}
          alt="Signature"
          draggable={false}
          className="h-full w-full select-none object-contain p-1"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRequestSign}
          className="h-full w-full text-center text-xs italic text-text-muted"
        >
          Tap to sign
        </button>
      );
  }
}
