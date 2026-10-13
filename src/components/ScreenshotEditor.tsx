import React, { useRef, useState, type PointerEvent } from "react";

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
  const [redoStack, setRedoStack] = useState<RectangleAnnotation[][]>([]);

  const [selectedTool, setSelectedTool] = useState<
    "rectangle" | "arrow" | "text"
  >("rectangle");
  const [textInput, setTextInput] = useState("");

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
      color: "#ef4444",
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
      color: "#ef4444",
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

    const nextAnnotations = [...annotations, draft];

    setAnnotations(nextAnnotations);
    onAnnotationsChange(nextAnnotations);
    setRedoStack([]);
    setDraft(null);
  };

  const handlePointerCancel = () => {
    setIsDrawing(false);
    startPoint.current = null;
    setDraft(null);
  };

  const handleUndo = () => {
    if (annotations.length === 0) return;
    setRedoStack((current) => [...current, annotations]);

    const nextAnnotation = annotations.slice(0, -1);

    setAnnotations(nextAnnotation);
    onAnnotationsChange(nextAnnotation);
    setDraft(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const previousAnnotations = redoStack[redoStack.length - 1];
    setAnnotations(previousAnnotations);
    onAnnotationsChange(previousAnnotations);
    setRedoStack((current) => current.slice(0, -1));
    setDraft(null);
  };

  const handleClear = () => {
    setAnnotations([]);
    setRedoStack([]);
    setDraft(null);
    onAnnotationsChange([]);
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
    context.strokeStyle = "#ef4444";

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

        const fontSize = 18 * scaleY;
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
            {selectedTool === "text"
              ? "Enter text above, then click on the image to place it."
              : `Click and drag over the image to draw red ${
                  selectedTool === "rectangle" ? "rectangles" : "arrows"
                }.`}
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
            <input
              type="text"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="Enter annotation text"
              aria-label="annotation text"
              className="rounded-lg border px-3 py-2"
            />
          )}
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
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${imageRef.current?.clientWidth || 1} ${imageRef.current?.clientHeight || 1}`}
          preserveAspectRatio="none"
        >
          {annotations.map((annotation) => {
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
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            } else if (annotation.type === "arrow") {
              return (
                <ArrowShape
                  key={annotation.id}
                  x1={annotation.startX ?? annotation.x}
                  y1={annotation.startY ?? annotation.y}
                  x2={annotation.endX ?? annotation.x}
                  y2={annotation.endY ?? annotation.y}
                  color={annotation.color}
                />
              );
            }

            return (
              <text
                key={annotation.id}
                x={annotation.x}
                y={annotation.y}
                fill={annotation.color}
                fontSize={18}
                fontWeight={500}
                dominantBaseline="hanging"
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
                fill="#ef4444"
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
