import { useRef, useState, type PointerEvent } from "react";
import type {
  AnnotationArrow,
  AnnotationStroke,
  EditorTool,
  Point,
} from "../types/editor.types";

type ScreenshotCanvasProps = {
  screenshot: string;
  activeTool: EditorTool;
  strokes: AnnotationStroke[];
  activeStroke: AnnotationStroke | null;
  arrows: AnnotationArrow[];
  activeArrow: AnnotationArrow | null;
  penColor: string;
  penWidth: number;
  arrowColor: string;
  arrowWidth: number;
  onStartStroke: (
    point: Point,
    color: string,
    width: number,
    tool: "pen" | "highlighter",
  ) => void;
  onContinueStroke: (point: Point) => void;
  onFinishStroke: () => void;
  onCancelStroke: () => void;
  onStartArrow: (point: Point, color: string, width: number) => void;
  onContinueArrow: (point: Point) => void;
  onFinishArrow: () => void;
  onCancelArrow: () => void;
};

const strokeToPath = (stroke: AnnotationStroke) =>
  stroke.points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");

const ArrowShape = ({ arrow }: { arrow: AnnotationArrow }) => {
  const { start, end, color, width } = arrow;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(12, width * 3);
  const headAngle = Math.PI / 6;

  const leftX = end.x - headLength * Math.cos(angle - headAngle);
  const leftY = end.y - headLength * Math.sin(angle - headAngle);
  const rightX = end.x - headLength * Math.cos(angle + headAngle);
  const rightY = end.y - headLength * Math.sin(angle + headAngle);

  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      <polyline
        points={`${leftX},${leftY} ${end.x},${end.y} ${rightX},${rightY}`}
      />
    </g>
  );
};

const ScreenshotCanvas = ({
  screenshot,
  activeTool,
  strokes,
  activeStroke,
  arrows,
  activeArrow,
  penColor,
  penWidth,
  arrowColor,
  arrowWidth,
  onStartStroke,
  onContinueStroke,
  onFinishStroke,
  onCancelStroke,
  onStartArrow,
  onContinueArrow,
  onFinishArrow,
  onCancelArrow,
}: ScreenshotCanvasProps) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const isDrawingStroke = activeTool === "pen" || activeTool === "highlighter";
  const isDrawingArrow = activeTool === "arrow";
  const isDrawing = isDrawingStroke || isDrawingArrow;

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
    if (event.button !== 0 && !isDrawing) return;

    const point = getPoint(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (isDrawingArrow) {
      onStartArrow(point, arrowColor, arrowWidth);
      return;
    }

    if (activeTool === "pen" || activeTool === "highlighter") {
      onStartStroke(point, penColor, penWidth, activeTool);
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const point = getPoint(event);
    if (!point) return;

    if (isDrawingArrow) {
      onContinueArrow(point);
    } else if (isDrawingStroke) {
      onContinueStroke(point);
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);

    if (isDrawingArrow) {
      onFinishArrow();
    } else if (isDrawingStroke) {
      onFinishStroke();
    }
  };

  const handlePointerCancel = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    if (isDrawingArrow) {
      onCancelArrow();
    } else if (isDrawingStroke) {
      onCancelStroke();
    }
  };

  const visibleStrokes = activeStroke ? [...strokes, activeStroke] : strokes;
  const visibleArrows = activeArrow ? [...arrows, activeArrow] : arrows;

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
              isDrawing ? "touch-none cursor-crosshair" : "pointer-events-none"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {visibleStrokes.map((stroke) => (
              <g key={stroke.id} opacity={stroke.opacity}>
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
            {visibleArrows.map((arrow) => (
              <ArrowShape key={arrow.id} arrow={arrow} />
            ))}
          </svg>
        )}
      </div>
    </section>
  );
};

export default ScreenshotCanvas;
