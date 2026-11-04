"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Check, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

export interface SignatureDrawing {
  png: string;
  svg?: string;
}

interface SignaturePoint {
  x: number;
  y: number;
}

type SignatureStroke = SignaturePoint[];

interface SignaturePadProps {
  initialValue?: string | null;
  onSave: (signature: string) => void;
  onSaveDrawing?: (drawing: SignatureDrawing) => void;
  onCancel: () => void;
}

export function SignaturePad({
  initialValue,
  onSave,
  onCancel,
  onSaveDrawing,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const currentStrokeRef = useRef<SignatureStroke | null>(null);
  const hasInitialImageRef = useRef(false);

  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.strokeStyle = "#111827";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.clearRect(0, 0, canvas.width, canvas.height);

    strokesRef.current = [];
    currentStrokeRef.current = null;
    hasInitialImageRef.current = false;
    setHasDrawing(false);

    if (!initialValue) return;

    const image = new Image();

    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      hasInitialImageRef.current = true;
      setHasDrawing(true);
    };

    image.onerror = () => {
      console.error("Failed to load existing signature.");
    };

    image.src = initialValue;
  }, [initialValue]);

  function getPosition(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function createSignatureSvg(
    strokes: SignatureStroke[],
    width: number,
    height: number,
  ): string {
    const paths = strokes
      .filter((stroke) => stroke.length > 0)
      .map((stroke) => {
        const [first, ...rest] = stroke;

        const d = [
          `M ${first.x} ${first.y}`,
          ...rest.map((point) => `L ${point.x} ${point.y}`),
        ].join(" ");

        return `<path d="${d}" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join("");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      paths,
      "</svg>",
    ].join("");
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = getPosition(event);
    const stroke: SignatureStroke = [point];

    strokesRef.current.push(stroke);
    currentStrokeRef.current = stroke;

    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.1, point.y + 0.1);
    context.stroke();

    setHasDrawing(true);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const point = getPosition(event);

    currentStrokeRef.current?.push(point);

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    currentStrokeRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    strokesRef.current = [];
    currentStrokeRef.current = null;
    hasInitialImageRef.current = false;

    setHasDrawing(false);
  }

  function handleSave() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const png = canvas.toDataURL("image/png");

    if (onSaveDrawing) {
      const svg =
        !hasInitialImageRef.current && strokesRef.current.length > 0
          ? createSignatureSvg(strokesRef.current, canvas.width, canvas.height)
          : undefined;

      onSaveDrawing({ png, svg });
      return;
    }

    onSave(png);
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={1200}
        height={360}
        aria-label="Draw your signature"
        className="w-full touch-none rounded-md border border-border bg-white"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onLostPointerCapture={() => {
          drawingRef.current = false;
          currentStrokeRef.current = null;
        }}
      />

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={clear} color="neutral">
          <Eraser size={15} />
          Clear
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            color="neutral"
            onClick={onCancel}
          >
            <X size={16} />
            Cancel
          </Button>

          <Button type="button" disabled={!hasDrawing} onClick={handleSave}>
            <Check size={15} />
            Use signature
          </Button>
        </div>
      </div>
    </div>
  );
}
