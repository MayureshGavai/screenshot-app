import { useEffect, useRef, useState, type PointerEvent } from "react";
import type {
  AnnotationArrow,
  AnnotationCircle,
  AnnotationRectangle,
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
  rectangles: AnnotationRectangle[];
  activeRectangle: AnnotationRectangle | null;
  circles: AnnotationCircle[];
  activeCircle: AnnotationCircle | null;
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
  onStartShape: (
    tool: "rectangle" | "circle",
    point: Point,
    color: string,
    width: number,
  ) => void;
  onContinueShape: (tool: "rectangle" | "circle", point: Point) => void;
  onFinishShape: (tool: "rectangle" | "circle") => void;
  onCancelShape: (tool: "rectangle" | "circle") => void;
  onUpdateArrow: (
    id: string,
    updates: Partial<Pick<AnnotationArrow, "start" | "end">>,
  ) => void;
  onBeginArrowEdit: () => void;
  onFinishArrowEdit: () => void;
};

type DragTarget = "start" | "end" | "move";

type DragOrigin = {
  pointer: Point;
  start: Point;
  end: Point;
};

const HANDLE_RADIUS = 8;
const HANDLE_HIT_RADIUS = 18;
const ARROW_HIT_DISTANCE = 12;

const distanceBetween = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distanceBetween(point, start);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  );

  return distanceBetween(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
  });
};

const strokeToPath = (stroke: AnnotationStroke) =>
  stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

const getShapeBounds = (shape: AnnotationRectangle | AnnotationCircle) => ({
  x: Math.min(shape.start.x, shape.end.x),
  y: Math.min(shape.start.y, shape.end.y),
  width: Math.abs(shape.end.x - shape.start.x),
  height: Math.abs(shape.end.y - shape.start.y),
});

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

const RectangleShape = ({ rectangle }: { rectangle: AnnotationRectangle }) => {
  const bounds = getShapeBounds(rectangle);

  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill="none"
      stroke={rectangle.color}
      strokeWidth={rectangle.width}
    />
  );
};

const CircleShape = ({ circle }: { circle: AnnotationCircle }) => {
  const bounds = getShapeBounds(circle);

  return (
    <ellipse
      cx={bounds.x + bounds.width / 2}
      cy={bounds.y + bounds.height / 2}
      rx={bounds.width / 2}
      ry={bounds.height / 2}
      fill="none"
      stroke={circle.color}
      strokeWidth={circle.width}
    />
  );
};

const ScreenshotCanvas = ({
  screenshot,
  activeTool,
  strokes,
  activeStroke,
  arrows,
  activeArrow,
  rectangles,
  activeRectangle,
  circles,
  activeCircle,
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
  onStartShape,
  onContinueShape,
  onFinishShape,
  onCancelShape,
  onUpdateArrow,
  onBeginArrowEdit,
  onFinishArrowEdit,
}: ScreenshotCanvasProps) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const dragTargetRef = useRef<{
    arrowId: string;
    endpoint: DragTarget;
  } | null>(null);

  const dragOriginRef = useRef<DragOrigin | null>(null);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [hoveredArrowId, setHoveredArrowId] = useState<string | null>(null);

  const isDrawingStroke = activeTool === "pen" || activeTool === "highlighter";
  const isDrawingArrow = activeTool === "arrow";
  const isDrawingShape = activeTool === "rectangle" || activeTool === "circle";
  const isDrawing = isDrawingStroke || isDrawingArrow || isDrawingShape;

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

  const handleArrowHover = (point: Point) => {
    const hitArrow = [...arrows]
      .reverse()
      .find(
        (arrow) =>
          distanceToSegment(point, arrow.start, arrow.end) <=
          ARROW_HIT_DISTANCE + arrow.width / 2,
      );

    setHoveredArrowId(hitArrow?.id ?? null);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;

    const point = getPoint(event);
    if (!point) return;

    if (activeTool === "select") {
      const selectedArrow = arrows.find(
        (arrow) => arrow.id === selectedArrowId,
      );

      if (selectedArrow) {
        const startDistance = distanceBetween(point, selectedArrow.start);
        const endDistance = distanceBetween(point, selectedArrow.end);

        if (
          startDistance <= HANDLE_HIT_RADIUS ||
          endDistance <= HANDLE_HIT_RADIUS
        ) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);

          onBeginArrowEdit();

          dragTargetRef.current = {
            arrowId: selectedArrow.id,
            endpoint: startDistance <= endDistance ? "start" : "end",
          };

          dragOriginRef.current = {
            pointer: point,
            start: { ...selectedArrow.start },
            end: { ...selectedArrow.end },
          };

          return;
        }

        const isOnSelectedArrow =
          distanceToSegment(point, selectedArrow.start, selectedArrow.end) <=
          ARROW_HIT_DISTANCE + selectedArrow.width / 2;

        if (isOnSelectedArrow) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);

          dragTargetRef.current = {
            arrowId: selectedArrow.id,
            endpoint: "move",
          };

          onBeginArrowEdit();

          dragOriginRef.current = {
            pointer: point,
            start: { ...selectedArrow.start },
            end: { ...selectedArrow.end },
          };

          return;
        }
      }

      const hitArrow = [...arrows]
        .reverse()
        .find(
          (arrow) =>
            distanceToSegment(point, arrow.start, arrow.end) <=
            ARROW_HIT_DISTANCE + arrow.width / 2,
        );

      setSelectedArrowId(hitArrow?.id ?? null);

      if (hitArrow) {
        event.preventDefault();
      }

      return;
    }

    if (!isDrawing) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedArrowId(null);

    if (isDrawingArrow) {
      onStartArrow(point, arrowColor, arrowWidth);
    } else if (isDrawingShape) {
      onStartShape(activeTool, point, penColor, penWidth);
    } else {
      onStartStroke(point, penColor, penWidth, activeTool);
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const point = getPoint(event);
    if (!point) return;

    if (activeTool === "select" && !dragTargetRef.current) {
      handleArrowHover(point);
    }

    const dragTarget = dragTargetRef.current;

    if (dragTarget) {
      if (dragTarget.endpoint === "move") {
        const origin = dragOriginRef.current;
        if (!origin) return;

        const dx = point.x - origin.pointer.x;
        const dy = point.y - origin.pointer.y;

        onUpdateArrow(dragTarget.arrowId, {
          start: {
            x: origin.start.x + dx,
            y: origin.start.y + dy,
          },
          end: {
            x: origin.end.x + dx,
            y: origin.end.y + dy,
          },
        });
      } else {
        onUpdateArrow(dragTarget.arrowId, {
          [dragTarget.endpoint]: point,
        });
      }

      return;
    }

    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    if (isDrawingArrow) {
      onContinueArrow(point);
    } else if (isDrawingShape) {
      onContinueShape(activeTool, point);
    } else if (isDrawingStroke) {
      onContinueStroke(point);
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasEditingArrow = dragTargetRef.current !== null;

    dragTargetRef.current = null;
    dragOriginRef.current = null;

    if (wasEditingArrow) {
      onFinishArrowEdit();
      return;
    }

    if (isDrawingArrow) {
      onFinishArrow();
    } else if (isDrawingShape) {
      onFinishShape(activeTool);
    } else if (isDrawingStroke) {
      onFinishStroke();
    }
  };

  const handlePointerCancel = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragTargetRef.current = null;
    dragOriginRef.current = null;

    if (isDrawingArrow) {
      onCancelArrow();
    } else if (isDrawingShape) {
      onCancelShape(activeTool);
    } else if (isDrawingStroke) {
      onCancelStroke();
    }
  };

  useEffect(() => {
    if (activeTool !== "select") {
      setHoveredArrowId(null);
      setSelectedArrowId(null);
    }
  }, [activeTool]);

  const visibleStrokes = activeStroke ? [...strokes, activeStroke] : strokes;
  const visibleArrows = activeArrow ? [...arrows, activeArrow] : arrows;
  const visibleRectangles = activeRectangle
    ? [...rectangles, activeRectangle]
    : rectangles;
  const visibleCircles = activeCircle ? [...circles, activeCircle] : circles;

  const selectedArrow = arrows.find((arrow) => arrow.id === selectedArrowId);

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/50 p-4 sm:p-6">
      <div className="relative inline-flex max-h-full max-w-full shrink-0 shadow-lg">
        <img
          ref={imageRef}
          src={screenshot}
          alt="Captured screenshot"
          draggable={false}
          onLoad={(event) => {
            setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
          }}
          className="block h-auto max-h-full max-w-full select-none object-contain"
        />

        {imageSize.width > 0 && imageSize.height > 0 && (
          <svg
            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            preserveAspectRatio="none"
            aria-label="Screenshot annotation canvas"
            className={`absolute inset-0 h-full w-full touch-none ${
              isDrawing
                ? "cursor-crosshair"
                : activeTool === "select" &&
                    (hoveredArrowId !== null || selectedArrowId !== null)
                  ? "cursor-pointer"
                  : "cursor-default"
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

            {visibleRectangles.map((rectangle) => (
              <RectangleShape key={rectangle.id} rectangle={rectangle} />
            ))}

            {visibleCircles.map((circle) => (
              <CircleShape key={circle.id} circle={circle} />
            ))}

            {visibleArrows.map((arrow) => (
              <g key={arrow.id}>
                <ArrowShape arrow={arrow} />

                {activeTool === "select" && arrow.id === selectedArrowId && (
                  <>
                    <line
                      x1={arrow.start.x}
                      y1={arrow.start.y}
                      x2={arrow.end.x}
                      y2={arrow.end.y}
                      stroke="currentColor"
                      strokeOpacity={0.4}
                      strokeDasharray="4 4"
                      pointerEvents="none"
                    />

                    {[arrow.start, arrow.end].map((point, index) => (
                      <g
                        key={`${arrow.id}-handle-${index}`}
                        className="text-accent"
                      >
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={HANDLE_RADIUS}
                          fill="var(--background)"
                          stroke="currentColor"
                          strokeWidth={2}
                          style={{ cursor: "grab" }}
                        />
                      </g>
                    ))}
                  </>
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
