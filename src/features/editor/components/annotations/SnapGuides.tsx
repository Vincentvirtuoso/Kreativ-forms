import type { SnapGuides as SnapGuidesValue } from "../../utils/annotation-geometry";

export function SnapGuides({ guides }: { guides: SnapGuidesValue }) {
  return (
    <>
      {guides.x.map((x) => (
        <div
          key={`x-${x}`}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-30 w-px bg-pink-500/80"
          style={{ left: `${x}%` }}
        />
      ))}

      {guides.y.map((y) => (
        <div
          key={`y-${y}`}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-30 h-px bg-pink-500/80"
          style={{ top: `${y}%` }}
        />
      ))}
    </>
  );
}
