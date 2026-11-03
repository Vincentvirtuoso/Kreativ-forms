"use client";

import { useId } from "react";

interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface RadioGroupProps<T extends string> {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly RadioOption<T>[];
  disabled?: boolean;
}

export function RadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  disabled,
}: RadioGroupProps<T>) {
  const groupId = useId();

  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((option) => {
        const inputId = `${groupId}-${option.value}`;
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              checked
                ? "border-brand bg-brand/5"
                : "border-border hover:bg-surface-raised"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="mt-0.5 h-4 w-4 accent-brand"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-text">{option.label}</p>
              {option.description && (
                <p className="mt-0.5 text-xs text-text-muted">
                  {option.description}
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
