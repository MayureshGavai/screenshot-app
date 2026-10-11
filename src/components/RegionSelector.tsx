import React, { useRef, useState } from "react";

type Region = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RegionSelectorProps = {
  image: string;
  onCancel: () => void;
  onApply: (region: Region) => void;
};

const RegionSelector = ({ image, onApply, onCancel }: RegionSelectorProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [selection, setSelection] = useState<Region | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  const getPoint = (event: React.PointerEvent<HTMLImageElement>) => {
    const element = imageRef.current!;
    if (!element) {
      return { x: 0, y: 0 };
    }
    const rect = element?.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = getPoint(event);
    startPoint.current = point;
    setSelection({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
    setIsSelecting(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!isSelecting || !startPoint.current) return;
    const point = getPoint(event);
    const start = startPoint.current;
    setSelection({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  };

  const handlePointerUp = () => {
    setIsSelecting(false);
    startPoint.current = null;
  };

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold">Select region to crop</h2>
      <p className="mb-3 text-sm text-gray-600">
        Click and drag over the screenshot to select an area.
      </p>

      <div className="relative inline-block max-w-full overflow-hidden rounded-lg border">
        <img
          ref={imageRef}
          src={image}
          alt="screenshot to crop"
          draggable={false}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block h-auto max-h-[65vh] max-w-full select-none object-contain"
        />
        {selection && (
          <div
            className="pointer-events-none absolute border-2 border-green-500 bg-green-500/20"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
          />
        )}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (selection && selection.width >= 5 && selection.height >= 5) {
              onApply(selection);
            }
          }}
          disabled={
            !selection ||
            selection.width < 5 ||
            selection.height < 5 ||
            isSelecting
          }
          className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Apply crop
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </section>
  );
};

export default RegionSelector;
