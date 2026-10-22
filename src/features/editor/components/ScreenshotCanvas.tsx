import { useEffect, useRef, useState, type PointerEvent } from "react";
import type {
  AnnotationArrow,
  AnnotationCircle,
  AnnotationRectangle,
  AnnotationStroke,
  EditorTool,
  Point,
} from "../types/editor.types";
import {
  ARROW_HIT_DISTANCE,
  HANDLE_HIT_RADIUS,
  HANDLE_RADIUS,
} from "./canvas/canvas.constants";
import type {
  DragOrigin,
  DragTarget,
  EditableAnnotation,
} from "./canvas/canvas.types";
import {
  distanceBetween,
  distanceToSegment,
  findAnnotationAtPoint,
  getShapeBounds,
  isPointInsideCircle,
  isPointInsideRectangle,
  isPointNearCircle,
  isPointNearRectangle,
  strokeToPath,
} from "./canvas/canvas.utils";
import ArrowShape from "./shapes/ArrowShape";
import RectangleShape from "./shapes/RectangleShape";
import CircleShape from "./shapes/CircleShape";

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
  onUpdateArrow: (
    id: string,
    updates: Partial<Pick<AnnotationArrow, "start" | "end">>,
  ) => void;
  onFinishArrow: () => void;
  onCancelArrow: () => void;
  onStartShape: (
    tool: "rectangle" | "circle",
    point: Point,
    color: string,
    width: number,
  ) => void;
  onContinueShape: (tool: "rectangle" | "circle", point: Point) => void;
  onUpdateShape: (
    kind: "rectangle" | "circle",
    id: string,
    updates: Partial<
      Pick<AnnotationRectangle | AnnotationCircle, "start" | "end">
    >,
  ) => void;
  onFinishShape: (tool: "rectangle" | "circle") => void;
  onCancelShape: (tool: "rectangle" | "circle") => void;
  onBeginEdit: () => void;
  onFinishEdit: () => void;
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
  onUpdateShape,
  onFinishShape,
  onCancelShape,
  onUpdateArrow,
  onBeginEdit,
  onFinishEdit,
}: ScreenshotCanvasProps) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const dragTargetRef = useRef<DragTarget | null>(null);
  const dragOriginRef = useRef<DragOrigin | null>(null);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<EditableAnnotation | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] =
    useState<EditableAnnotation | null>(null);

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

  const handleAnnotationHover = (point: Point) => {
    const hitAnnotation = findAnnotationAtPoint(
      point,
      arrows,
      rectangles,
      circles,
    );

    setHoveredAnnotation(hitAnnotation);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;

    const point = getPoint(event);
    if (!point) return;

    if (activeTool === "select") {
      // First check whether the user clicked the currently selected annotation.
      if (selectedAnnotation) {
        let selectedItem:
          | AnnotationArrow
          | AnnotationRectangle
          | AnnotationCircle
          | undefined;

        if (selectedAnnotation.kind === "arrow") {
          selectedItem = arrows.find(
            (item) => item.id === selectedAnnotation.id,
          );
        } else if (selectedAnnotation.kind === "rectangle") {
          selectedItem = rectangles.find(
            (item) => item.id === selectedAnnotation.id,
          );
        } else {
          selectedItem = circles.find(
            (item) => item.id === selectedAnnotation.id,
          );
        }

        if (selectedItem) {
          const startDistance = distanceBetween(point, selectedItem.start);
          const endDistance = distanceBetween(point, selectedItem.end);

          if (
            startDistance <= HANDLE_HIT_RADIUS ||
            endDistance <= HANDLE_HIT_RADIUS
          ) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onBeginEdit();

            dragTargetRef.current = {
              ...selectedAnnotation,
              endpoint: startDistance <= endDistance ? "start" : "end",
            };

            dragOriginRef.current = {
              pointer: point,
              start: { ...selectedItem.start },
              end: { ...selectedItem.end },
            };

            return;
          }

          const isInsideSelected =
            selectedAnnotation.kind === "arrow"
              ? distanceToSegment(
                  point,
                  selectedItem.start,
                  selectedItem.end,
                ) <=
                ARROW_HIT_DISTANCE + selectedItem.width / 2
              : selectedAnnotation.kind === "rectangle"
                ? isPointInsideRectangle(point, selectedItem) ||
                  isPointNearRectangle(point, selectedItem)
                : isPointInsideCircle(point, selectedItem) ||
                  isPointNearCircle(point, selectedItem);

          if (isInsideSelected) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onBeginEdit();

            dragTargetRef.current = {
              ...selectedAnnotation,
              endpoint: "move",
            };

            dragOriginRef.current = {
              pointer: point,
              start: { ...selectedItem.start },
              end: { ...selectedItem.end },
            };

            return;
          }
        }
      }

      const hitAnnotation = findAnnotationAtPoint(
        point,
        arrows,
        rectangles,
        circles,
      );
      setSelectedAnnotation(hitAnnotation);

      if (hitAnnotation) {
        event.preventDefault();
      }

      return;
    }

    if (!isDrawing) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedAnnotation(null);

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
      handleAnnotationHover(point);
    }

    const dragTarget = dragTargetRef.current;

    if (dragTarget) {
      const origin = dragOriginRef.current;
      if (!origin) return;

      let updates: Partial<
        Pick<
          AnnotationArrow | AnnotationRectangle | AnnotationCircle,
          "start" | "end"
        >
      >;

      if (dragTarget.endpoint === "move") {
        const dx = point.x - origin.pointer.x;
        const dy = point.y - origin.pointer.y;

        updates = {
          start: {
            x: origin.start.x + dx,
            y: origin.start.y + dy,
          },
          end: {
            x: origin.end.x + dx,
            y: origin.end.y + dy,
          },
        };
      } else {
        updates = {
          [dragTarget.endpoint]: point,
        };
      }

      if (dragTarget.kind === "arrow") {
        onUpdateArrow(dragTarget.id, updates);
      } else {
        onUpdateShape(dragTarget.kind, dragTarget.id, updates);
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

    const wasEditing = dragTargetRef.current !== null;

    dragTargetRef.current = null;
    dragOriginRef.current = null;

    if (wasEditing) {
      onFinishEdit();
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
      setHoveredAnnotation(null);
      setSelectedAnnotation(null);
    }
  }, [activeTool]);

  const visibleStrokes = activeStroke ? [...strokes, activeStroke] : strokes;
  const visibleArrows = activeArrow ? [...arrows, activeArrow] : arrows;
  const visibleRectangles = activeRectangle
    ? [...rectangles, activeRectangle]
    : rectangles;
  const visibleCircles = activeCircle ? [...circles, activeCircle] : circles;

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
                    (hoveredAnnotation !== null || selectedAnnotation !== null)
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

                {activeTool === "select" &&
                  selectedAnnotation?.kind === "arrow" &&
                  arrow.id === selectedAnnotation.id && (
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
