"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Check, X } from "lucide-react";
import { Button } from "@splenddev/kreativ-ui/components";

interface SignaturePadProps {
  initialValue?: string | null;
  onSave: (signature: string) => void;
  onCancel: () => void;
}

export function SignaturePad({
  initialValue,
  onSave,
  onCancel,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.strokeStyle = "#111827";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";

    if (!initialValue) return;

    const image = new Image();

    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setHasDrawing(true);
    };

    image.onerror = () => {
      console.error("Failed to load existing signature.");
    };

    image.src = initialValue;
  }, [initialValue]);

  function getPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    event.preventDefault();

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const { x, y } = getPosition(event);

    context.beginPath();
    context.moveTo(x, y);

    // Render a dot for a single-point signature.
    context.lineTo(x + 0.1, y + 0.1);
    context.stroke();

    setHasDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const { x, y } = getPosition(event);

    context.lineTo(x, y);
    context.stroke();
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  }

  function save() {
    const canvas = canvasRef.current;

    if (!canvas || !hasDrawing) return;

    onSave(canvas.toDataURL("image/png"));
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

          <Button type="button" disabled={!hasDrawing} onClick={save}>
            <Check size={15} />
            Use signature
          </Button>
        </div>
      </div>
    </div>
  );
}
