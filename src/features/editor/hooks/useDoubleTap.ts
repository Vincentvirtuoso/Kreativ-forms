import { useRef } from "react";
import {
  DOUBLE_TAP_DISTANCE,
  DOUBLE_TAP_MS,
} from "../utils/annotation-overlay.constants";

type Tap = { time: number; x: number; y: number; key: string };

export function useDoubleTap(
  windowMs = DOUBLE_TAP_MS,
  maxDistance = DOUBLE_TAP_DISTANCE,
) {
  const lastTapRef = useRef<Tap | null>(null);

  return function registerTap(event: React.PointerEvent, key: string): boolean {
    const now = event.timeStamp;
    const last = lastTapRef.current;

    const isDouble =
      !!last &&
      last.key === key &&
      now - last.time <= windowMs &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) <= maxDistance;

    lastTapRef.current = isDouble
      ? null
      : { time: now, x: event.clientX, y: event.clientY, key };

    return isDouble;
  };
}
