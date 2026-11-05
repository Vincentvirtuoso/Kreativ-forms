
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

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 480;
const STROKE_WIDTH = 4.5;
const INK_COLOR = "#111827";

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

  const configureContext = (
    context: CanvasRenderingContext2D,
  ) => {
    context.strokeStyle = INK_COLOR;
    context.fillStyle = INK_COLOR;
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.imageSmoothingEnabled = true;
  };

  // Draw smooth quadratic curves instead of connected straight lines.
  function drawSmoothStroke(
    context: CanvasRenderingContext2D,
    points: SignatureStroke,
  ) {
    if (!points.length) return;

    context.beginPath();

    const first = points[0];

    if (points.length === 1) {
      context.arc(first.x, first.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.moveTo(first.x, first.y);

    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      context.quadraticCurveTo(
        current.x,
        current.y,
        midX,
        midY,
      );
    }

    const last = points[points.length - 1];

    context.lineTo(last.x, last.y);
    context.stroke();
  }

  function redrawCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    configureContext(context);

    for (const stroke of strokesRef.current) {
      drawSmoothStroke(context, stroke);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    strokesRef.current = [];
    currentStrokeRef.current = null;
    drawingRef.current = false;
    hasInitialImageRef.current = false;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    configureContext(context);

    setHasDrawing(false);

    if (!initialValue) return;

    const image = new Image();

    image.onload = () => {
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.drawImage(
        image,
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      );

      hasInitialImageRef.current = true;
      setHasDrawing(true);
    };

    image.onerror = () => {
      console.error("Failed to load existing signature.");
    };

    image.src = initialValue;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [initialValue]);

  function getPosition(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): SignaturePoint {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();

    return {
      x:
        ((event.clientX - bounds.left) / bounds.width) *
        CANVAS_WIDTH,
      y:
        ((event.clientY - bounds.top) / bounds.height) *
        CANVAS_HEIGHT,
    };
  }

  function createSignatureSvg(): string {
    const paths = strokesRef.current
      .filter((stroke) => stroke.length > 0)
      .map((points) => {
        const first = points[0];

        if (points.length === 1) {
          return `<circle cx="${first.x}" cy="${first.y}" r="${STROKE_WIDTH / 2}" fill="${INK_COLOR}"/>`;
        }

        let d = `M ${first.x} ${first.y}`;

        for (let i = 1; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];

          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;

          d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
        }

        const last = points[points.length - 1];

        d += ` L ${last.x} ${last.y}`;

        return `<path d="${d}" fill="none" stroke="${INK_COLOR}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join("");

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${CANVAS_WIDTH}"
        height="${CANVAS_HEIGHT}"
        viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}"
      >
        ${paths}
      </svg>
    `.trim();
  }

  function startDrawing(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;

    if (!canvas) return;

    event.preventDefault();

    drawingRef.current = true;
    hasInitialImageRef.current = false;

    canvas.setPointerCapture(event.pointerId);

    const point = getPosition(event);
    const stroke: SignatureStroke = [point];

    strokesRef.current.push(stroke);
    currentStrokeRef.current = stroke;

    redrawCanvas();
    setHasDrawing(true);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    event.preventDefault();

    const point = getPosition(event);
    const stroke = currentStrokeRef.current;

    if (!stroke) return;

    const previous = stroke[stroke.length - 1];

    // Ignore extremely small pointer movements.
    const distance = Math.hypot(
      point.x - previous.x,
      point.y - previous.y,
    );

    if (distance < 1.2) return;

    stroke.push(point);

    // Re-render using smooth curves.
    redrawCanvas();
  }

  function stopDrawing(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
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

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    strokesRef.current = [];
    currentStrokeRef.current = null;
    drawingRef.current = false;
    hasInitialImageRef.current = false;

    setHasDrawing(false);
  }

  function handleSave() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const png = canvas.toDataURL("image/png");

    if (onSaveDrawing) {
      const svg = !hasInitialImageRef.current
        ? createSignatureSvg()
        : undefined;

      onSaveDrawing({ png, svg });
      return;
    }

    onSave(png);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="Draw your signature"
          className="block w-full touch-none"
          style={{ aspectRatio: "10 / 3" }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={() => {
            drawingRef.current = false;
            currentStrokeRef.current = null;
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          onClick={clear}
        >
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

          <Button
            type="button"
            disabled={!hasDrawing}
            onClick={handleSave}
          >
            <Check size={15} />
            Use signature
          </Button>
        </div>
      </div>
    </div>
  );
}
