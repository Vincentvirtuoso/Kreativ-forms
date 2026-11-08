"use client";

import { useEffect, useState } from "react";

import type { Annotation } from "../../domain/annotation.types";
import { PropertyInput } from "../PropertyFields";

const POSITION_FIELDS = [
  ["X", "x"],
  ["Y", "y"],
  ["Width", "width"],
  ["Height", "height"],
  ["Rotation (°)", "rotation"],
] as const;

type PositionKey = keyof Annotation["position"];

interface PositionSectionProps {
  position: Annotation["position"];
  onPositionChange: (key: PositionKey, value: number) => void;
}

export function PositionSection({
  position,
  onPositionChange,
}: PositionSectionProps) {
  const [drafts, setDrafts] = useState<Record<PositionKey, string>>({
    x: String(position.x),
    y: String(position.y),
    width: String(position.width),
    height: String(position.height),
    rotation: String(position.rotation),
  });

  useEffect(() => {
    setDrafts({
      x: String(position.x),
      y: String(position.y),
      width: String(position.width),
      height: String(position.height),
      rotation: String(position.rotation),
    });
  }, [
    position.x,
    position.y,
    position.width,
    position.height,
    position.rotation,
  ]);

  function handleChange(key: PositionKey, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  function handleBlur(key: PositionKey) {
    const value = drafts[key].trim();
    const number = Number(value);

    if (!value || !Number.isFinite(number)) {
      setDrafts((current) => ({
        ...current,
        [key]: String(position[key]),
      }));
      return;
    }

    const normalized =
      key === "rotation"
        ? Math.max(-360, Math.min(360, number))
        : Math.max(0, Math.min(100, number));

    onPositionChange(key, normalized);

    setDrafts((current) => ({
      ...current,
      [key]: String(normalized),
    }));
  }

  return (
    <div className="border-t border-border pt-4">
      <h4 className="mb-3 text-xs font-medium text-text-muted">
        Position and size
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {POSITION_FIELDS.map(([label, key]) => (
          <div
            key={key}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                handleBlur(key);
              }
            }}
          >
            <PropertyInput
              label={key === "rotation" ? label : `${label} (%)`}
              type="number"
              min={key === "rotation" ? -360 : 0}
              max={key === "rotation" ? 360 : 100}
              value={drafts[key]}
              onChange={(value) => handleChange(key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
