import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type {
  AnnotationArrow,
  AnnotationCircle,
  AnnotationFill,
  AnnotationRectangle,
  AnnotationStroke,
  AnnotationText,
  EditorTool,
  Point,
} from "../types/editor.types";
import {
  ARROW_HIT_DISTANCE,
  HANDLE_HIT_RADIUS,
  HANDLE_RADIUS,
} from "./canvas/canvas.constants";
import type {
  CropDrag,
  CropRect,
  DragOrigin,
  DragTarget,
  EditableAnnotation,
} from "./canvas/canvas.types";
import {
  distanceBetween,
  distanceToSegment,
  findAnnotationAtPoint,
  findAnnotationsIntersectingEraser,
  getShapeBounds,
  isPointInsideCircle,
  isPointInsideRectangle,
  isPointInsideText,
  isPointNearCircle,
  isPointNearRectangle,
  strokeToPath,
} from "./canvas/canvas.utils";
import ArrowShape from "./shapes/ArrowShape";
import RectangleShape from "./shapes/RectangleShape";
import CircleShape from "./shapes/CircleShape";
import TextShape, { type TextBounds } from "./shapes/TextShape";

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
  shapeColor: string;
  shapeWidth: number;
  shapeFill: AnnotationFill | null;
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
    fill: AnnotationFill | null,
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
  texts: AnnotationText[];
  activeText: AnnotationText | null;
  textColor: string;
  textFontSize: number;
  textFontWeight: "normal" | "bold";
  onStartText: (
    point: Point,
    color: string,
    fontSize: number,
    fontWeight: "normal" | "bold",
  ) => void;
  onUpdateActiveText: (updates: Partial<AnnotationText>) => void;
  onFinishText: () => void;
  onCancelText: () => void;
  onUpdateText: (id: string, updates: Partial<AnnotationText>) => void;
  onBeginErase: () => void;
  onEraseAnnotations: (ids: string[]) => void;
  onFinishErase: () => void;
  onCropSelectionChange: (rect: CropRect | null) => void;
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
  shapeColor,
  shapeFill,
  shapeWidth,
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
  texts,
  activeText,
  textColor,
  textFontSize,
  textFontWeight,
  onStartText,
  onUpdateActiveText,
  onUpdateText,
  onFinishText,
  onCancelText,
  onBeginErase,
  onEraseAnnotations,
  onFinishErase,
  onCropSelectionChange,
}: ScreenshotCanvasProps) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const dragTargetRef = useRef<DragTarget | null>(null);
  const dragOriginRef = useRef<DragOrigin | null>(null);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const cropDragRef = useRef<CropDrag | null>(null);

  const CROP_MIN_SIZE = 50;
  const CROP_HANDLE_SIZE = 10;
  const CROP_HANDLE_HIT_SIZE = 18;

  const [selectedAnnotation, setSelectedAnnotation] =
    useState<EditableAnnotation | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] =
    useState<EditableAnnotation | null>(null);

  const [pointerPosition, setPointerPosition] = useState<Point | null>(null);
  const [eraserCursorRadius, setEraserCursorRadius] = useState(0);

  const isDrawingStroke = activeTool === "pen" || activeTool === "highlighter";
  const isDrawingArrow = activeTool === "arrow";
  const isDrawingShape = activeTool === "rectangle" || activeTool === "circle";
  const isErasing = activeTool === "eraser";
  const isDrawing =
    isDrawingStroke || isDrawingArrow || isDrawingShape || isErasing;
  const ERASER_DISPLAY_RADIUS = 18;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textBoundsRef = useRef<Map<string, TextBounds>>(new Map());

  const handleTextBoundsChange = useCallback(
    (id: string, bounds: TextBounds) => {
      textBoundsRef.current.set(id, bounds);
    },
    [],
  );

  useEffect(() => {
    if (activeTool !== "crop" || !imageSize.width || !imageSize.height) {
      return;
    }

    setCropRect({
      x: 0,
      y: 0,
      width: imageSize.width,
      height: imageSize.height,
    });

    cropDragRef.current = null;
  }, [activeTool, imageSize]);

  useEffect(() => {
    if (activeTool === "crop") {
      onCropSelectionChange(cropRect);
    }
  }, [activeTool, cropRect, onCropSelectionChange]);

  useEffect(() => {
    if (activeText) {
      textareaRef.current?.focus();
    }
  }, [activeText?.id]);

  const getEraserRadius = (svg: SVGSVGElement) => {
    const bounds = svg.getBoundingClientRect();

    if (!bounds.width || !imageSize.width) return ERASER_DISPLAY_RADIUS;

    return ERASER_DISPLAY_RADIUS * (imageSize.width / bounds.width);
  };

  const eraseAtPoint = (point: Point, radius: number) => {
    const ids = findAnnotationsIntersectingEraser(
      point,
      radius,
      strokes,
      arrows,
      rectangles,
      circles,
      texts,
      textBoundsRef.current,
    );

    onEraseAnnotations(ids);
  };

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
      texts,
      textBoundsRef.current,
    );

    setHoveredAnnotation(hitAnnotation);
  };

  const getCropHandle = (
    point: Point,
    rect: CropRect,
  ): CropResizeHandle | null => {
    const midX = rect.x + rect.width / 2;
    const midY = rect.y + rect.height / 2;

    const handles: {
      type: CropResizeHandle;
      x: number;
      y: number;
    }[] = [
      { type: "top-left", x: rect.x, y: rect.y },
      { type: "top", x: midX, y: rect.y },
      { type: "top-right", x: rect.x + rect.width, y: rect.y },
      { type: "right", x: rect.x + rect.width, y: midY },
      { type: "bottom-right", x: rect.x + rect.width, y: rect.y + rect.height },
      { type: "bottom", x: midX, y: rect.y + rect.height },
      { type: "bottom-left", x: rect.x, y: rect.y + rect.height },
      { type: "left", x: rect.x, y: midY },
    ];

    const hit = handles.find(
      (handle) =>
        Math.abs(point.x - handle.x) <= CROP_HANDLE_HIT_SIZE &&
        Math.abs(point.y - handle.y) <= CROP_HANDLE_HIT_SIZE,
    );

    return hit?.type ?? null;
  };

  const isInsideCrop = (point: Point, rect: CropRect) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;

  const updateCropResize = (
    point: Point,
    drag: Extract<CropDrag, { type: "resize" }>,
  ) => {
    const { startRect, startPointer, handle } = drag;

    const dx = point.x - startPointer.x;
    const dy = point.y - startPointer.y;

    let left = startRect.x;
    let top = startRect.y;
    let right = startRect.x + startRect.width;
    let bottom = startRect.y + startRect.height;

    if (handle.includes("left")) {
      left = Math.max(0, Math.min(right - CROP_MIN_SIZE, left + dx));
    }

    if (handle.includes("right")) {
      right = Math.min(
        imageSize.width,
        Math.max(left + CROP_MIN_SIZE, right + dx),
      );
    }

    if (handle.includes("top")) {
      top = Math.max(0, Math.min(bottom - CROP_MIN_SIZE, top + dy));
    }

    if (handle.includes("bottom")) {
      bottom = Math.min(
        imageSize.height,
        Math.max(top + CROP_MIN_SIZE, bottom + dy),
      );
    }

    setCropRect({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    });
  };

  const handleCropPointerDown = (
    event: PointerEvent<SVGSVGElement>,
    point: Point,
  ) => {
    if (!cropRect) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const handle = getCropHandle(point, cropRect);

    if (handle) {
      cropDragRef.current = {
        type: "resize",
        handle,
        startPointer: point,
        startRect: { ...cropRect },
      };
      return;
    }

    if (isInsideCrop(point, cropRect)) {
      cropDragRef.current = {
        type: "move",
        startPointer: point,
        startRect: { ...cropRect },
      };
    }
  };

  const handleCropPointerMove = (point: Point) => {
    const drag = cropDragRef.current;
    if (!drag) return;

    if (drag.type === "resize") {
      updateCropResize(point, drag);
      return;
    }

    const dx = point.x - drag.startPointer.x;
    const dy = point.y - drag.startPointer.y;

    setCropRect({
      ...drag.startRect,
      x: Math.max(
        0,
        Math.min(imageSize.width - drag.startRect.width, drag.startRect.x + dx),
      ),
      y: Math.max(
        0,
        Math.min(
          imageSize.height - drag.startRect.height,
          drag.startRect.y + dy,
        ),
      ),
    });
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;

    const point = getPoint(event);
    if (!point) return;

    if (activeTool === "crop") {
      handleCropPointerDown(event, point);
      return;
    }

    if (activeText) {
      event.preventDefault();
      onFinishText();
      return;
    }

    if (activeTool === "text") {
      event.preventDefault();
      onStartText(point, textColor, textFontSize, textFontWeight);

      return;
    }

    if (isErasing) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const radius = getEraserRadius(event.currentTarget);

      setPointerPosition(point);
      setEraserCursorRadius(radius);

      setSelectedAnnotation(null);
      setHoveredAnnotation(null);

      onBeginErase();

      eraseAtPoint(point, radius);

      return;
    }

    if (activeTool === "select") {
      // Handle an already-selected text annotation.
      if (selectedAnnotation?.kind === "text") {
        const selectedText = texts.find(
          (item) => item.id === selectedAnnotation.id,
        );

        if (selectedText && isPointInsideText(point, selectedText)) {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);

          onBeginEdit();

          dragTargetRef.current = {
            kind: "text",
            id: selectedText.id,
            endpoint: "move",
          };

          dragOriginRef.current = {
            pointer: point,
            x: selectedText.x,
            y: selectedText.y,
          };

          return;
        }
      }
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

          let isInsideSelected = false;

          if (selectedAnnotation.kind === "arrow") {
            const selectedArrow = arrows.find(
              (item) => item.id === selectedAnnotation.id,
            );

            if (selectedArrow) {
              isInsideSelected =
                distanceToSegment(
                  point,
                  selectedArrow.start,
                  selectedArrow.end,
                ) <=
                ARROW_HIT_DISTANCE + selectedArrow.width / 2;
            }
          } else if (selectedAnnotation.kind === "rectangle") {
            const selectedRectangle = rectangles.find(
              (item) => item.id === selectedAnnotation.id,
            );

            if (selectedRectangle) {
              isInsideSelected =
                isPointInsideRectangle(point, selectedRectangle) ||
                isPointNearRectangle(point, selectedRectangle);
            }
          } else if (selectedAnnotation.kind === "circle") {
            const selectedCircle = circles.find(
              (item) => item.id === selectedAnnotation.id,
            );

            if (selectedCircle) {
              isInsideSelected =
                isPointInsideCircle(point, selectedCircle) ||
                isPointNearCircle(point, selectedCircle);
            }
          }

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
        texts,
        textBoundsRef.current,
      );
      setSelectedAnnotation(hitAnnotation);

      if (hitAnnotation?.kind === "text") {
        const selectedText = texts.find((item) => item.id === hitAnnotation.id);

        if (!selectedText) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        onBeginEdit();

        dragTargetRef.current = {
          kind: "text",
          id: selectedText.id,
          endpoint: "move",
        };

        dragOriginRef.current = {
          pointer: point,
          x: selectedText.x,
          y: selectedText.y,
        };

        return;
      }

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
      onStartShape(activeTool, point, shapeColor, shapeWidth, shapeFill);
    } else {
      onStartStroke(point, penColor, penWidth, activeTool);
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const point = getPoint(event);
    if (!point) return;

    if (activeTool === "crop") {
      handleCropPointerMove(point);
      return;
    }

    if (isErasing) {
      setPointerPosition(point);
      setEraserCursorRadius(getEraserRadius(event.currentTarget));
    }

    if (activeTool === "select" && !dragTargetRef.current) {
      handleAnnotationHover(point);
    }

    const dragTarget = dragTargetRef.current;

    if (dragTarget) {
      const origin = dragOriginRef.current;
      if (!origin) return;

      // Move text annotation
      if (dragTarget.kind === "text") {
        onUpdateText(dragTarget.id, {
          x: (origin.x ?? 0) + (point.x - origin.pointer.x),
          y: (origin.y ?? 0) + (point.y - origin.pointer.y),
        });

        return;
      }

      // Move or resize arrow, rectangle, or circle
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
            x: origin.start!.x + dx,
            y: origin.start!.y + dy,
          },
          end: {
            x: origin.end!.x + dx,
            y: origin.end!.y + dy,
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

    if (isErasing && event.currentTarget.hasPointerCapture(event.pointerId)) {
      eraseAtPoint(point, getEraserRadius(event.currentTarget));
      return;
    }

    // Continue drawing annotations
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
    if (activeTool === "crop") {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      cropDragRef.current = null;
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (isErasing) {
      onFinishErase();
      return;
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
    if (activeTool === "crop") {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      cropDragRef.current = null;
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (isErasing) {
      onFinishErase();
      return;
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

    if (activeTool !== "eraser") {
      setPointerPosition(null);
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
      <div className="relative inline-flex max-h-full max-w-full shrink-0 overflow-hidden shadow-lg">
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
              activeTool === "eraser"
                ? "cursor-none"
                : activeTool === "crop"
                  ? "cursor-move"
                  : isDrawing
                    ? "cursor-crosshair"
                    : activeTool === "select" &&
                        (hoveredAnnotation !== null ||
                          selectedAnnotation !== null)
                      ? "cursor-pointer"
                      : "cursor-default"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={() => setPointerPosition(null)}
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
              <g key={rectangle.id}>
                <RectangleShape rectangle={rectangle} />

                {activeTool === "select" &&
                  selectedAnnotation?.kind === "rectangle" &&
                  rectangle.id === selectedAnnotation.id && (
                    <>
                      <rect
                        x={Math.min(rectangle.start.x, rectangle.end.x)}
                        y={Math.min(rectangle.start.y, rectangle.end.y)}
                        width={Math.abs(rectangle.end.x - rectangle.start.x)}
                        height={Math.abs(rectangle.end.y - rectangle.start.y)}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.6}
                        strokeDasharray="5 4"
                        strokeWidth={2}
                        pointerEvents="none"
                      />

                      {[rectangle.start, rectangle.end].map((point, index) => (
                        <circle
                          key={`${rectangle.id}-handle-${index}`}
                          cx={point.x}
                          cy={point.y}
                          r={HANDLE_RADIUS}
                          fill="var(--accent)"
                          stroke="currentColor"
                          strokeWidth={2}
                          style={{ cursor: "grab" }}
                        />
                      ))}
                    </>
                  )}
              </g>
            ))}

            {visibleCircles.map((circle) => (
              <g key={circle.id}>
                <CircleShape circle={circle} />

                {activeTool === "select" &&
                  selectedAnnotation?.kind === "circle" &&
                  circle.id === selectedAnnotation.id && (
                    <>
                      <ellipse
                        cx={(circle.start.x + circle.end.x) / 2}
                        cy={(circle.start.y + circle.end.y) / 2}
                        rx={Math.abs(circle.end.x - circle.start.x) / 2}
                        ry={Math.abs(circle.end.y - circle.start.y) / 2}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.6}
                        strokeDasharray="5 4"
                        strokeWidth={2}
                        pointerEvents="none"
                      />

                      {[circle.start, circle.end].map((point, index) => (
                        <circle
                          key={`${circle.id}-handle-${index}`}
                          cx={point.x}
                          cy={point.y}
                          r={HANDLE_RADIUS}
                          fill="var(--accent)"
                          stroke="currentColor"
                          strokeWidth={2}
                          style={{ cursor: "grab" }}
                        />
                      ))}
                    </>
                  )}
              </g>
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
                        <g key={`${arrow.id}-handle-${index}`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={HANDLE_RADIUS}
                            fill="var(--accent)"
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

            {texts.map((annotation) => (
              <TextShape
                key={annotation.id}
                annotation={annotation}
                selected={
                  selectedAnnotation?.kind === "text" &&
                  selectedAnnotation.id === annotation.id
                }
                onBoundsChange={handleTextBoundsChange}
              />
            ))}

            {activeTool === "eraser" && pointerPosition && (
              <circle
                cx={pointerPosition.x}
                cy={pointerPosition.y}
                r={eraserCursorRadius}
                fill="#94a3b8"
                fillOpacity={0.15}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
            )}

            {activeTool === "crop" && cropRect && (
              <g>
                {/* Darken the area above the selection */}
                <rect
                  x={0}
                  y={0}
                  width={imageSize.width}
                  height={cropRect.y}
                  fill="black"
                  fillOpacity={0.55}
                  pointerEvents="none"
                />

                {/* Darken the area below the selection */}
                <rect
                  x={0}
                  y={cropRect.y + cropRect.height}
                  width={imageSize.width}
                  height={imageSize.height - cropRect.y - cropRect.height}
                  fill="black"
                  fillOpacity={0.55}
                  pointerEvents="none"
                />

                {/* Darken the area left of the selection */}
                <rect
                  x={0}
                  y={cropRect.y}
                  width={cropRect.x}
                  height={cropRect.height}
                  fill="black"
                  fillOpacity={0.55}
                  pointerEvents="none"
                />

                {/* Darken the area right of the selection */}
                <rect
                  x={cropRect.x + cropRect.width}
                  y={cropRect.y}
                  width={imageSize.width - cropRect.x - cropRect.width}
                  height={cropRect.height}
                  fill="black"
                  fillOpacity={0.55}
                  pointerEvents="none"
                />

                {/* Crop selection border */}
                <rect
                  x={cropRect.x}
                  y={cropRect.y}
                  width={cropRect.width}
                  height={cropRect.height}
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  pointerEvents="none"
                />

                {/* Eight resize handles */}
                {[
                  [cropRect.x, cropRect.y],
                  [cropRect.x + cropRect.width / 2, cropRect.y],
                  [cropRect.x + cropRect.width, cropRect.y],
                  [
                    cropRect.x + cropRect.width,
                    cropRect.y + cropRect.height / 2,
                  ],
                  [cropRect.x + cropRect.width, cropRect.y + cropRect.height],
                  [
                    cropRect.x + cropRect.width / 2,
                    cropRect.y + cropRect.height,
                  ],
                  [cropRect.x, cropRect.y + cropRect.height],
                  [cropRect.x, cropRect.y + cropRect.height / 2],
                ].map(([x, y], index) => (
                  <rect
                    key={`crop-handle-${index}`}
                    x={x - CROP_HANDLE_SIZE / 2}
                    y={y - CROP_HANDLE_SIZE / 2}
                    width={CROP_HANDLE_SIZE}
                    height={CROP_HANDLE_SIZE}
                    fill="white"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    pointerEvents="none"
                  />
                ))}
              </g>
            )}
          </svg>
        )}
        {activeText && imageRef.current && (
          <textarea
            ref={textareaRef}
            autoFocus
            value={activeText.text}
            onChange={(event) =>
              onUpdateActiveText({ text: event.target.value })
            }
            onBlur={onFinishText}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Escape") {
                event.preventDefault();
                onCancelText();
              }

              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder="Type something..."
            style={{
              position: "absolute",
              left:
                activeText.x * (imageRef.current.clientWidth / imageSize.width),
              top:
                activeText.y *
                (imageRef.current.clientHeight / imageSize.height),
              width:
                activeText.width *
                (imageRef.current.clientWidth / imageSize.width),
              minHeight: 50,
              color: activeText.color,
              fontSize:
                activeText.fontSize *
                (imageRef.current.clientHeight / imageSize.height),
              fontWeight: activeText.fontWeight,
              fontFamily: "Inter, sans-serif",
              resize: "both",
              overflow: "hidden",
              background: "transparent",
              border: "1px dashed currentColor",
              outline: "none",
              padding: 2,
              zIndex: 10,
            }}
            className="leading-tight"
          />
        )}
      </div>
    </section>
  );
};

export default ScreenshotCanvas;
