"use client";

import ColorPicker from "@/components/ui/color-picker";
import { Checkbox, FormField, Input } from "@splenddev/kreativ-ui/components";

export function Property({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="wrap-break-word text-sm capitalize">{value}</span>
    </div>
  );
}

export function PropertyInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <FormField>
      <FormField.Label className="text-xs">{label}</FormField.Label>
      <FormField.Control>
        {type === "color" ? (
          <ColorPicker
            value={value}
            onChange={(color) => onChange(color.hex)}
            showAlpha={false}
          />
        ) : (
          <Input
            size="sm"
            type={type}
            value={value}
            min={min}
            max={max}
            onChange={(event) => onChange(event.target.value)}
            placeholder=""
          />
        )}
      </FormField.Control>
    </FormField>
  );
}

export function PropertyCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      label={label}
      checked={checked}
      size="xs"
      onCheckedChange={(check) => onChange(check)}
    />
  );
}

interface PropertySelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function PropertySelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: PropertySelectProps<T>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-text-muted">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-text outline-none focus:border-brand"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
