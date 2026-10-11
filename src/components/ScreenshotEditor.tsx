import React, { useRef, useState, type PointerEvent } from "react";

export type RectangleAnnotation = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

type ScreenshotEditorProps = {
  image: string;
  onAnnotationsChange: (annotations: RectangleAnnotation[]) => void;
};

type Point = {
  x: number;
  y: number;
};

const MIN_SIZE = 3;

const ScreenshotEditor = ({
  image,
  onAnnotationsChange,
}: ScreenshotEditorProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const startPoint = useRef<Point | null>(null);

  const [annotations, setAnnotations] = useState<RectangleAnnotation[]>([]);
  const [draft, setDraft] = useState<RectangleAnnotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPoint = (event: PointerEvent<HTMLDivElement>): Point | null => {
    const element = imageRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const point = getPoint(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startPoint.current = point;
    setDraft({
      id: crypto.randomUUID(),
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      color: "#ef4444",
    });
    setIsDrawing(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint.current) return;
    const point = getPoint(event);
    if (!point) return;
    const start = startPoint.current;
    setDraft((current) =>
      current
        ? {
            ...current,
            x: Math.min(start.x, point.x),
            y: Math.min(start.y, point.y),
            width: Math.abs(point.x - start.x),
            height: Math.abs(point.y - start.y),
          }
        : null,
    );
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    startPoint.current = null;

    if (!draft || draft.width < MIN_SIZE || draft.height < MIN_SIZE) {
      setDraft(null);
      return;
    }

    setAnnotations((current) => {
      const next = [...current, draft];
      onAnnotationsChange(next);
      return next;
    });
    setDraft(null);
  };

  const handlePointerCancel = () => {
    setIsDrawing(false);
    startPoint.current = null;
    setDraft(null);
  };

  const handleUndo = () => {
    setAnnotations((current) => {
      const next = current.slice(0, -1);
      onAnnotationsChange(next);
      return next;
    });
    setDraft(null);
  };

  const handleClear = () => {
    setAnnotations([]);
    setDraft(null);
    onAnnotationsChange([]);
  };

  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Screenshot editor</h2>
          <p className="text-sm text-gray-600">
            Click and drag over the image to draw red rectangles.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={annotations.length === 0 || isDrawing}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={annotations.length === 0 || isDrawing}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        className="relative inline-block max-w-full touch-none select-none overflow-hidden rounded-lg border"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <img
          ref={imageRef}
          src={image}
          alt="screenshot being edited"
          draggable="false"
          className="block h-auto max-h-[65vh] max-w-full object-contain"
        />

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${imageRef.current?.clientWidth || 1} ${imageRef.current?.clientHeight || 1}`}
          preserveAspectRatio="none"
        >
          {annotations.map((annotation) => (
            <rect
              key={annotation.id}
              x={annotation.x}
              y={annotation.y}
              width={annotation.width}
              height={annotation.height}
              fill="none"
              stroke={annotation.color}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {draft && (
            <rect
              x={draft.x}
              y={draft.y}
              width={draft.width}
              height={draft.height}
              fill="#ef444"
              fillOpacity={0.12}
              stroke={draft.color}
              strokeWidth={2}
              strokeDasharray="6 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Rectangles: {annotations.length}
      </p>
    </section>
  );
};

export default ScreenshotEditor;
