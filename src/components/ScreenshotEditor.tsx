import React, { useRef, useState, type PointerEvent } from "react";
import { ANNOTATION_COLORS } from "../constants/colors";

type ImageDimensions = {
  displayWidth: number;
  displayHeight: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type RectangleAnnotation = {
  id: string;
  type: "rectangle" | "arrow" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
  fontSize?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
};

type ScreenshotEditorProps = {
  image: string;
  onAnnotationsChange: (annotations: RectangleAnnotation[]) => void;
  onExport: (imageDataUrl: string) => void;
};

type Point = {
  x: number;
  y: number;
};

const MIN_SIZE = 3;

type ArrowShapeProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth?: number;
};

const ArrowShape = ({
  x1,
  y1,
  x2,
  y2,
  color,
  strokeWidth = 2,
}: ArrowShapeProps) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 12;
  const headAngle = Math.PI / 6;

  const leftX = x2 - headLength * Math.cos(angle - headAngle);
  const leftY = y2 - headLength * Math.sin(angle - headAngle);
  const rightX = x2 - headLength * Math.cos(angle + headAngle);
  const rightY = y2 - headLength * Math.sin(angle + headAngle);

  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={`${leftX},${leftY} ${x2},${y2} ${rightX},${rightY}`} />
    </g>
  );
};

const ScreenshotEditor = ({
  image,
  onAnnotationsChange,
  onExport,
}: ScreenshotEditorProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const startPoint = useRef<Point | null>(null);

  const [annotations, setAnnotations] = useState<RectangleAnnotation[]>([]);
  const [draft, setDraft] = useState<RectangleAnnotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<RectangleAnnotation[][]>([]);
  const [redoStack, setRedoStack] = useState<RectangleAnnotation[][]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);

  const [selectedTool, setSelectedTool] = useState<
    "rectangle" | "arrow" | "text"
  >("rectangle");
  const [textInput, setTextInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const [selectedFontSize, setSelectedFontSize] = useState(18);
  const [isEditingText, setIsEditingText] = useState(false);

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

  const handleSelectedAnnotation = (id: string) => {
    setSelectedAnnotationId(id);
    const annotation = annotations.find((item) => item.id === id);
    if (annotation?.type === "text") {
      setTextInput(annotation.text ?? "");
      setSelectedFontSize(annotation.fontSize ?? 18);
      setIsEditingText(false);
    }
  };

  const handleChangeSelectedColor = (color: string) => {
    setSelectedColor(color);
    if (!selectedColor) return;

    const nextAnnotations = annotations.map((annotation) =>
      annotation.id === selectedAnnotationId
        ? { ...annotation, color }
        : annotation,
    );

    const hasChanged = nextAnnotations.some(
      (annotation, index) => annotation.color !== annotations[index]?.color,
    );

    if (!hasChanged) return;

    commitAnnotations(nextAnnotations);
  };

  const findAnnotationAtPoint = (point: Point): string | null => {
    for (const annotation of [...annotations].reverse()) {
      if (annotation.type === "rectangle") {
        const tolerance = 8;

        const nearLeft = Math.abs(point.x - annotation.x) <= tolerance;
        const nearRight =
          Math.abs(point.x - (annotation.x + annotation.width)) <= tolerance;
        const nearTop = Math.abs(point.y - annotation.y) <= tolerance;
        const nearBottom =
          Math.abs(point.y - (annotation.y + annotation.height)) <= tolerance;

        const withinHorizontal =
          point.x >= annotation.x - tolerance &&
          point.x <= annotation.x + annotation.width + tolerance;

        const withinVertical =
          point.y >= annotation.y - tolerance &&
          point.y <= annotation.y + annotation.height + tolerance;

        if (
          (withinVertical && (nearLeft || nearRight)) ||
          (withinHorizontal && (nearTop || nearBottom))
        ) {
          return annotation.id;
        }
      }

      if (annotation.type === "arrow") {
        const x1 = annotation.startX ?? annotation.x;
        const y1 = annotation.startY ?? annotation.y;
        const x2 = annotation.endX ?? annotation.x;
        const y2 = annotation.endY ?? annotation.y;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        const t =
          lengthSquared === 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  1,
                  ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSquared,
                ),
              );

        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        if (Math.hypot(point.x - closestX, point.y - closestY) <= 8) {
          return annotation.id;
        }
      }

      if (annotation.type === "text") {
        const fontSize = annotation.fontSize ?? 18;
        const textWidth = (annotation.text?.length ?? 0) * fontSize * 0.6;
        const textHeight = fontSize * 1.4;

        if (
          point.x >= annotation.x - 4 &&
          point.x <= annotation.x + textWidth + 4 &&
          point.y >= annotation.y - 4 &&
          point.y <= annotation.y + textHeight
        ) {
          return annotation.id;
        }
      }
    }

    return null;
  };

  const handlePlaceText = (event: PointerEvent<HTMLDivElement>) => {
    if (selectedTool !== "text") return;
    if (event.button !== 0) return;

    const point = getPoint(event);
    if (!point) return;

    const text = textInput.trim();
    if (!text) return;

    const newAnnotation: RectangleAnnotation = {
      id: crypto.randomUUID(),
      type: "text",
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      color: selectedColor,
      fontSize: selectedFontSize,
      text,
    };

    const nextAnnotations = [...annotations, newAnnotation];
    setAnnotations(nextAnnotations);
    onAnnotationsChange(nextAnnotations);
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
      type: selectedTool,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      color: selectedColor,
      startX: point.x,
      startY: point.y,
      endX: point.x,
      endY: point.y,
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
        ? current.type === "rectangle"
          ? {
              ...current,
              x: Math.min(start.x, point.x),
              y: Math.min(start.y, point.y),
              width: Math.abs(point.x - start.x),
              height: Math.abs(point.y - start.y),
            }
          : {
              ...current,
              startX: start.x,
              startY: start.y,
              endX: point.x,
              endY: point.y,
            }
        : null,
    );
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    startPoint.current = null;

    if (!draft) {
      setDraft(null);
      return;
    }

    const isValidAnnotation =
      draft.type === "rectangle"
        ? draft.width >= MIN_SIZE && draft.height >= MIN_SIZE
        : Math.hypot(
            (draft.endX ?? draft.x) - (draft.startX ?? draft.x),
            (draft.endY ?? draft.y) - (draft.startY ?? draft.y),
          ) >= MIN_SIZE;

    if (!isValidAnnotation) {
      setDraft(null);
      return;
    }

    commitAnnotations([...annotations, draft]);
    setRedoStack([]);
    setDraft(null);
  };

  const handlePointerCancel = () => {
    setIsDrawing(false);
    startPoint.current = null;
    setDraft(null);
  };

  const saveHistory = (currentAnnotations: RectangleAnnotation[]) => {
    setRedoStack((current) => [...current, currentAnnotations]);
  };

  const commitAnnotations = (nextAnnotations: RectangleAnnotation[]) => {
    setUndoStack((current) => [...current, annotations]);
    setRedoStack([]);
    setAnnotations(nextAnnotations);
    onAnnotationsChange(nextAnnotations);
    setDraft(null);
  };

  const handleUpdateSelectedText = () => {
    if (!selectedAnnotationId) return;

    const selectedAnnotation = annotations.find(
      (annotation) => annotation.id === selectedAnnotationId,
    );

    if (selectedAnnotation?.type !== "text") return;

    const text = textInput.trim();
    if (!text) return;

    const nextAnnotations = annotations.map((annotation) =>
      annotation.id === selectedAnnotationId
        ? {
            ...annotation,
            text,
            fontSize: selectedFontSize,
          }
        : annotation,
    );

    const hasChanged = nextAnnotations.some(
      (annotation, index) =>
        annotation.text !== annotations[index]?.text ||
        annotation.fontSize !== annotations[index]?.fontSize,
    );

    if (!hasChanged) {
      setIsEditingText(false);
      return;
    }

    commitAnnotations(nextAnnotations);
    setIsEditingText(false);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const previousAnnotations = undoStack[undoStack.length - 1];

    setRedoStack((current) => [...current, annotations]);
    setUndoStack((current) => current.slice(0, -1));
    setAnnotations(previousAnnotations);
    onAnnotationsChange(previousAnnotations);
    setSelectedAnnotationId(null);
    setDraft(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextAnnotations = redoStack[redoStack.length - 1];

    setUndoStack((current) => [...current, annotations]);
    setRedoStack((current) => current.slice(0, -1));
    setAnnotations(nextAnnotations);
    onAnnotationsChange(nextAnnotations);
    setSelectedAnnotationId(null);
    setDraft(null);
  };

  const handleClear = () => {
    if (annotations.length === 0) return;

    commitAnnotations([]);
    setSelectedAnnotationId(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedAnnotationId) return;

    const nextAnnotations = annotations.filter(
      (annotation) => annotation.id !== selectedAnnotationId,
    );

    if (nextAnnotations.length === annotations.length) return;

    commitAnnotations(nextAnnotations);
    setSelectedAnnotationId(null);
  };

  const getImageDimensions = (): ImageDimensions | null => {
    const imageElement = imageRef.current;
    if (
      !imageElement ||
      !imageElement.naturalWidth ||
      !imageElement.naturalHeight
    ) {
      return null;
    }

    const rect = imageElement.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    return {
      displayWidth: rect.width,
      displayHeight: rect.height,
      naturalWidth: imageElement.naturalWidth,
      naturalHeight: imageElement.naturalHeight,
    };
  };

  const getExportAnnotations = () => {
    const dimensions = getImageDimensions();
    if (!dimensions) return [];

    const scaleX = dimensions.naturalWidth / dimensions.displayWidth;
    const scaleY = dimensions.naturalHeight / dimensions.displayHeight;
    return annotations.map((annotation) => ({
      ...annotation,
      x: annotation.x * scaleX,
      y: annotation.y * scaleY,
      width: annotation.width * scaleX,
      height: annotation.height * scaleY,
      startX:
        annotation.startX === undefined
          ? undefined
          : annotation.startX * scaleX,
      startY:
        annotation.startY === undefined
          ? undefined
          : annotation.startY * scaleY,
      endX:
        annotation.endX === undefined ? undefined : annotation.endX * scaleX,
      endY:
        annotation.endY === undefined ? undefined : annotation.endY * scaleY,
    }));
  };

  const handleExport = () => {
    const imageElement = imageRef.current;
    if (
      !imageElement ||
      !imageElement.complete ||
      !imageElement.naturalWidth ||
      !imageElement.naturalHeight
    )
      return;

    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    const exportAnnotations = getExportAnnotations();

    context.lineWidth = 2;
    context.strokeStyle = selectedColor;

    exportAnnotations.forEach((annotation) => {
      context.strokeStyle = annotation.color;
      if (annotation.type === "rectangle") {
        context.strokeRect(
          annotation.x,
          annotation.y,
          annotation.width,
          annotation.height,
        );
        return;
      }

      if (annotation.type === "text") {
        if (!annotation.text) return;

        const dimensions = getImageDimensions();
        if (!dimensions) return;

        const scaleY = dimensions.naturalHeight / dimensions.displayHeight;

        const fontSize = (annotation.fontSize ?? 18) * scaleY;
        context.fillStyle = annotation.color;
        context.font = `500 ${fontSize}px Inter, sans-serif`;
        context.textBaseline = "hanging";
        context.fillText(annotation.text, annotation.x, annotation.y);
        return;
      }

      const startX = annotation.startX ?? annotation.x;
      const startY = annotation.startY ?? annotation.y;
      const endX = annotation.endX ?? annotation.x;
      const endY = annotation.endY ?? annotation.y;

      const angle = Math.atan2(endY - startY, endX - startX);
      const headLength = 12;
      const headAngle = Math.PI / 6;

      const leftX = endX - headLength * Math.cos(angle - headAngle);
      const leftY = endY - headLength * Math.sin(angle - headAngle);

      const rightX = endX - headLength * Math.cos(angle + headAngle);
      const rightY = endY - headLength * Math.sin(angle + headAngle);

      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();

      context.beginPath();
      context.moveTo(leftX, leftY);
      context.lineTo(endX, endY);
      context.lineTo(rightX, rightY);
      context.stroke();
    });

    const imageDataUrl = canvas.toDataURL("image/png");

    console.log("Export image format", imageDataUrl.substring(0, 30));
    console.log("Exported image size", imageDataUrl.length);
    console.log("Exported image dimensions", {
      width: canvas.width,
      height: canvas.height,
    });
    onExport(imageDataUrl);
  };

  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Screenshot editor</h2>
          <p className="text-sm text-gray-600">
            {selectedAnnotationId &&
            annotations.some(
              (annotation) =>
                annotation.id === selectedAnnotationId &&
                annotation.type === "text",
            )
              ? "Edit the selected text, choose a size, then click Apply changes."
              : "Enter text, choose a size, then click the image to place it."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedTool("rectangle")}
            aria-pressed={selectedTool === "rectangle"}
            className={`rounded-lg border px-3 py-2 ${selectedTool === "rectangle" ? "border-green-500 text-green-700 bg-green-50" : ""}`}
          >
            Rectangle
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool("arrow")}
            aria-pressed={selectedTool === "arrow"}
            className={`rounded-lg border px-3 py-2 ${selectedTool === "arrow" ? "border-green-500 text-green-700 bg-green-50" : ""}`}
          >
            Arrow
          </button>

          <button
            type="button"
            onClick={() => setSelectedTool("text")}
            aria-pressed={selectedTool === "text"}
            className={`rounded-lg border px-3 py-2 ${selectedTool === "text" ? "border-green-500 text-green-700 bg-green-50" : ""}`}
          >
            Text
          </button>
          {selectedTool === "text" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(event) => {
                  setTextInput(event.target.value);
                  setIsEditingText(true);
                }}
                placeholder="Enter annotation text"
                aria-label="Annotation text"
                className="rounded-lg border px-3 py-2"
              />

              <label className="flex items-center gap-2 text-sm">
                Size
                <select
                  value={selectedFontSize}
                  onChange={(event) => {
                    setSelectedFontSize(Number(event.target.value));
                    setIsEditingText(true);
                  }}
                  className="rounded-lg border px-2 py-2"
                  aria-label="Text font size"
                >
                  {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </label>

              {annotations.some(
                (annotation) =>
                  annotation.id === selectedAnnotationId &&
                  annotation.type === "text",
              ) && (
                <button
                  type="button"
                  onClick={handleUpdateSelectedText}
                  disabled={!textInput.trim()}
                  className="rounded-lg border px-3 py-2 disabled:opacity-50"
                >
                  Apply changes
                </button>
              )}
            </div>
          )}
          <div className="relative flex items-center gap-2">
            <span className="text-sm">Color</span>
            <label
              title="Choose a custom annotation color"
              className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: selectedColor }}
            >
              <input
                type="color"
                value={selectedColor}
                onChange={(event) =>
                  handleChangeSelectedColor(event.target.value)
                }
                aria-label="Choose annotation color"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`Select color ${color}`}
                  aria-pressed={selectedColor === color}
                  onClick={() => handleChangeSelectedColor(color)}
                  className={`h-6 w-6 rounded-full border ${
                    selectedColor === color
                      ? "ring-2 ring-blue-500 ring-offset-1"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
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
            onClick={handleDeleteSelected}
            disabled={!selectedAnnotationId || isDrawing}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            Delete selected
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={annotations.length === 0 || isDrawing}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0 || isDrawing}
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-green-500 px-3 py-2 text-white"
          >
            Export annotated image
          </button>
        </div>
      </div>

      <div
        className="relative inline-block max-w-full touch-none select-none overflow-hidden rounded-lg border"
        onPointerDown={(event) => {
          if (event.button !== 0) return;

          const point = getPoint(event);
          if (!point) return;

          const annotationId = findAnnotationAtPoint(point);

          if (annotationId) {
            event.preventDefault();
            handleSelectedAnnotation(annotationId);
            return;
          }

          setSelectedAnnotationId(null);

          if (selectedTool === "text") {
            handlePlaceText(event);
            return;
          }

          handlePointerDown(event);
        }}
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
          className="absolute inset-0 h-full w-full overflow-visible pointer-events-auto"
          viewBox={`0 0 ${imageRef.current?.clientWidth || 1} ${imageRef.current?.clientHeight || 1}`}
          preserveAspectRatio="none"
          onClick={() => console.log("clicked>>>")}
        >
          {annotations.map((annotation) => {
            const isSelected = annotation.id === selectedAnnotationId;
            if (annotation.type === "rectangle") {
              return (
                <rect
                  key={annotation.id}
                  x={annotation.x}
                  y={annotation.y}
                  width={annotation.width}
                  height={annotation.height}
                  fill="none"
                  stroke={annotation.color}
                  strokeWidth={isSelected ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="stroke"
                  onClick={() => {
                    handleSelectedAnnotation(annotation.id);
                  }}
                  style={{ cursor: "pointer" }}
                />
              );
            } else if (annotation.type === "arrow") {
              return (
                <g
                  key={annotation.id}
                  onClick={() => handleSelectedAnnotation(annotation.id)}
                  style={{ cursor: "pointer" }}
                  pointerEvents="stroke"
                >
                  <ArrowShape
                    x1={annotation.startX ?? annotation.x}
                    y1={annotation.startY ?? annotation.y}
                    x2={annotation.endX ?? annotation.x}
                    y2={annotation.endY ?? annotation.y}
                    color={annotation.color}
                  />
                  {isSelected && (
                    <circle
                      cx={annotation.startX ?? annotation.x}
                      cy={annotation.startY ?? annotation.y}
                      r={4}
                      fill={annotation.color}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            }

            return (
              <text
                key={annotation.id}
                x={annotation.x}
                y={annotation.y}
                fill={annotation.color}
                fontSize={annotation.fontSize ?? 18}
                fontWeight={500}
                dominantBaseline="hanging"
                pointerEvents="visiblePainted"
                onClick={() => handleSelectedAnnotation(annotation.id)}
                style={{ cursor: "pointer" }}
                stroke={isSelected ? annotation.color : "none"}
                strokeWidth={isSelected ? 2 : 0}
                paintOrder="stroke"
              >
                {annotation.text}
              </text>
            );
          })}

          {draft &&
            (draft.type === "rectangle" ? (
              <rect
                x={draft.x}
                y={draft.y}
                width={draft.width}
                height={draft.height}
                fill={selectedColor}
                fillOpacity={0.12}
                stroke={draft.color}
                strokeWidth={2}
                strokeDasharray="6 3"
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <ArrowShape
                x1={draft.startX ?? draft.x}
                y1={draft.startY ?? draft.y}
                x2={draft.endX ?? draft.x}
                y2={draft.endY ?? draft.y}
                color={draft.color}
              />
            ))}
        </svg>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Annotations: {annotations.length}
      </p>
    </section>
  );
};

export default ScreenshotEditor;
