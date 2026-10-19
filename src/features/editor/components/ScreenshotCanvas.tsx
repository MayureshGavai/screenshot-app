import { useRef, useState, type PointerEvent } from "react";
import type { EditorTool, Penstroke, Point } from "../types/editor.types";

type ScreenshotCanvasProps = {
  screenshot: string;
  activeTool: EditorTool;
  strokes: Penstroke[];
  activeStroke: Penstroke | null;
  penColor: string;
  penWidth: number;
  onStartStroke: (point: Point, color: string, width: number) => void;
  onContinueStroke: (point: Point) => void;
  onFinishStroke: () => void;
  onCancelStroke: () => void;
};

const strokeToPath = (stroke: Penstroke) =>
  stroke.points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");

const ScreenshotCanvas = ({
  screenshot,
  activeTool,
  strokes,
  activeStroke,
  penColor,
  penWidth,
  onStartStroke,
  onContinueStroke,
  onFinishStroke,
  onCancelStroke,
}: ScreenshotCanvasProps) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const isPenActive = activeTool === "pen";

  const getPoint = (event: PointerEvent<SVGSVGElement>): Point | null => {
    const image = imageRef.current;
    if (!image || !imageSize.width || !imageSize.height) return null;

    const bounds = event.currentTarget.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return null;

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * imageSize.width,
      y: ((event.clientY - bounds.top) / bounds.height) * imageSize.height,
    };
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!isPenActive || event.button !== 0) return;

    const point = getPoint(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onStartStroke(point, penColor, penWidth);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (
      !isPenActive ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    const point = getPoint(event);
    if (point) onContinueStroke(point);
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      onFinishStroke();
    }
  };

  const handlePointerCancel = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      onCancelStroke();
    }
  };

  const visibleStrokes = activeStroke ? [...strokes, activeStroke] : strokes;

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/50 p-4 sm:p-6">
      <div className="relative inline-flex max-h-full max-w-full shrink-0 shadow-lg">
        <img
          ref={imageRef}
          src={screenshot}
          alt="Captured screenshot"
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            setImageSize({
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
          }}
          className="block h-auto max-h-full max-w-full select-none object-contain"
        />

        {imageSize.width > 0 && imageSize.height > 0 && (
          <svg
            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            preserveAspectRatio="none"
            aria-label="Screenshot annotation canvas"
            className={`absolute inset-0 h-full w-full ${
              isPenActive
                ? "touch-none cursor-crosshair"
                : "pointer-events-none"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {visibleStrokes.map((stroke) => (
              <g key={stroke.id}>
                {stroke.points.length === 1 ? (
                  <circle
                    cx={stroke.points[0].x}
                    cy={stroke.points[0].y}
                    r={stroke.width / 2}
                    fill={stroke.color}
                  />
                ) : (
                  <path
                    d={strokeToPath(stroke)}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            ))}
          </svg>
        )}
      </div>
    </section>
  );
};

export default ScreenshotCanvas;
