import { useCallback, useRef, useState } from "react";
import type {
  AnnotationArrow,
  AnnotationStroke,
  AnnotationRectangle,
  AnnotationCircle,
  Point,
  AnnotationFill,
  AnnotationText,
} from "../types/editor.types";

type StrokeTool = AnnotationStroke["tool"];

type AnnotationItem =
  | { kind: "stroke"; value: AnnotationStroke }
  | { kind: "arrow"; value: AnnotationArrow }
  | { kind: "rectangle"; value: AnnotationRectangle }
  | { kind: "circle"; value: AnnotationCircle }
  | { kind: "text"; value: AnnotationText };

type EditableAnnotationKind = "arrow" | "rectangle" | "circle" | "text";

type ShapeTool = "rectangle" | "circle";

type AnnotationShape = AnnotationRectangle | AnnotationCircle;

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type UndoEntry = {
  history: AnnotationItem[];
  screenshot?: string;
};

const isBoundsIntersectingCrop = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  crop: CropRect,
) => {
  return (
    right >= crop.x &&
    left <= crop.x + crop.width &&
    bottom >= crop.y &&
    top <= crop.y + crop.height
  );
};

const transformPoint = (point: Point, crop: CropRect): Point => ({
  x: point.x - crop.x,
  y: point.y - crop.y,
});

const cropAnnotation = (
  item: AnnotationItem,
  crop: CropRect,
): AnnotationItem | null => {
  switch (item.kind) {
    case "stroke": {
      const points = item.value.points;
      if (points.length === 0) return null;

      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);

      const intersects = isBoundsIntersectingCrop(
        Math.min(...xs) - item.value.width / 2,
        Math.min(...ys) - item.value.width / 2,
        Math.max(...xs) + item.value.width / 2,
        Math.max(...ys) + item.value.width / 2,
        crop,
      );

      if (!intersects) return null;

      return {
        kind: "stroke",
        value: {
          ...item.value,
          points: points.map((point) => transformPoint(point, crop)),
        },
      };
    }

    case "arrow":
    case "rectangle":
    case "circle": {
      const { start, end, width } = item.value;

      const intersects = isBoundsIntersectingCrop(
        Math.min(start.x, end.x) - width / 2,
        Math.min(start.y, end.y) - width / 2,
        Math.max(start.x, end.x) + width / 2,
        Math.max(start.y, end.y) + width / 2,
        crop,
      );

      if (!intersects) return null;

      return {
        ...item,
        value: {
          ...item.value,
          start: transformPoint(start, crop),
          end: transformPoint(end, crop),
        },
      } as AnnotationItem;
    }

    case "text": {
      const text = item.value;

      const intersects = isBoundsIntersectingCrop(
        text.x,
        text.y,
        text.x + text.width,
        text.y + text.fontSize * 1.5,
        crop,
      );

      if (!intersects) return null;

      return {
        kind: "text",
        value: {
          ...text,
          x: text.x - crop.x,
          y: text.y - crop.y,
        },
      };
    }
  }
};

export const useAnnotations = () => {
  const [history, setHistory] = useState<AnnotationItem[]>([]);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const [activeStroke, setActiveStroke] = useState<AnnotationStroke | null>(
    null,
  );
  const [activeArrow, setActiveArrow] = useState<AnnotationArrow | null>(null);

  const [activeRectangle, setActiveRectangle] =
    useState<AnnotationRectangle | null>(null);
  const [activeCircle, setActiveCircle] = useState<AnnotationCircle | null>(
    null,
  );

  const [activeText, setActiveText] = useState<AnnotationText | null>(null);

  const editSnapshotRef = useRef<AnnotationItem[] | null>(null);
  const eraseSnapshotRef = useRef<AnnotationItem[] | null>(null);
  const hasErasedAnnotationsRef = useRef(false);

  const clipboardRef = useRef<AnnotationItem | null>(null);

  const strokes = history
    .filter(
      (item): item is Extract<AnnotationItem, { kind: "stroke" }> =>
        item.kind === "stroke",
    )
    .map((item) => item.value);

  const arrows = history
    .filter(
      (item): item is Extract<AnnotationItem, { kind: "arrow" }> =>
        item.kind === "arrow",
    )
    .map((item) => item.value);

  const rectangles = history
    .filter(
      (item): item is Extract<AnnotationItem, { kind: "rectangle" }> =>
        item.kind === "rectangle",
    )
    .map((item) => item.value);

  const circles = history
    .filter(
      (item): item is Extract<AnnotationItem, { kind: "circle" }> =>
        item.kind === "circle",
    )
    .map((item) => item.value);

  const texts = history
    .filter(
      (item): item is Extract<AnnotationItem, { kind: "text" }> =>
        item.kind === "text",
    )
    .map((item) => item.value);

  const startStroke = useCallback(
    (point: Point, color: string, width: number, tool: StrokeTool) => {
      setActiveArrow(null);
      setActiveRectangle(null);
      setActiveCircle(null);
      setActiveStroke({
        id: crypto.randomUUID(),
        points: [point],
        color,
        width,
        tool,
        opacity: tool === "highlighter" ? 0.35 : 1,
      });
    },
    [],
  );

  const continueStroke = useCallback((point: Point) => {
    setActiveStroke((current) =>
      current ? { ...current, points: [...current.points, point] } : null,
    );
  }, []);

  const finishStroke = useCallback(() => {
    if (activeStroke) {
      setUndoStack((previous) => [...previous, { history }]);
      setRedoStack([]);
      setHistory((previous) => [
        ...previous,
        { kind: "stroke", value: activeStroke },
      ]);
    }

    setActiveStroke(null);
  }, [activeStroke, history]);

  const startArrow = useCallback(
    (point: Point, color: string, width: number) => {
      setActiveStroke(null);
      setActiveRectangle(null);
      setActiveCircle(null);
      setActiveArrow({
        id: crypto.randomUUID(),
        start: point,
        end: point,
        color,
        width,
      });
    },
    [],
  );

  const continueArrow = useCallback((point: Point) => {
    setActiveArrow((current) => (current ? { ...current, end: point } : null));
  }, []);

  const finishArrow = useCallback(() => {
    if (activeArrow) {
      const distance = Math.hypot(
        activeArrow.end.x - activeArrow.start.x,
        activeArrow.end.y - activeArrow.start.y,
      );

      if (distance >= 3) {
        setUndoStack((previous) => [...previous, { history }]);
        setRedoStack([]);
        setHistory((previous) => [
          ...previous,
          { kind: "arrow", value: activeArrow },
        ]);
      }
    }

    setActiveArrow(null);
  }, [activeArrow, history]);

  const startShape = useCallback(
    (
      tool: ShapeTool,
      point: Point,
      color: string,
      width: number,
      fill: AnnotationFill | null,
    ) => {
      setActiveStroke(null);
      setActiveArrow(null);

      const shape: AnnotationShape = {
        id: crypto.randomUUID(),
        start: point,
        end: point,
        color,
        width,
        fill,
      };

      setActiveRectangle(tool === "rectangle" ? shape : null);
      setActiveCircle(tool === "circle" ? shape : null);
    },
    [],
  );

  const continueShape = useCallback((tool: ShapeTool, point: Point) => {
    if (tool === "rectangle") {
      setActiveRectangle((current) =>
        current ? { ...current, end: point } : null,
      );
    } else {
      setActiveCircle((current) =>
        current ? { ...current, end: point } : null,
      );
    }
  }, []);

  const finishShape = useCallback(
    (tool: ShapeTool) => {
      const shape = tool === "rectangle" ? activeRectangle : activeCircle;

      if (shape) {
        const distance = Math.hypot(
          shape.end.x - shape.start.x,
          shape.end.y - shape.start.y,
        );

        if (distance >= 3) {
          setUndoStack((previous) => [...previous, { history }]);
          setRedoStack([]);

          setHistory((previous) => [
            ...previous,
            tool === "rectangle"
              ? {
                  kind: "rectangle",
                  value: shape as AnnotationRectangle,
                }
              : {
                  kind: "circle",
                  value: shape as AnnotationCircle,
                },
          ]);
        }
      }

      if (tool === "rectangle") {
        setActiveRectangle(null);
      } else {
        setActiveCircle(null);
      }
    },
    [activeRectangle, activeCircle, history],
  );

  const cancelStroke = useCallback(() => {
    setActiveStroke(null);
  }, []);

  const cancelArrow = useCallback(() => {
    setActiveArrow(null);
  }, []);

  const cancelShape = useCallback((tool: ShapeTool) => {
    if (tool === "rectangle") {
      setActiveRectangle(null);
    } else {
      setActiveCircle(null);
    }
  }, []);

  const beginEdit = useCallback(() => {
    if (editSnapshotRef.current === null) {
      editSnapshotRef.current = history;
    }
  }, [history]);

  const updateArrow = useCallback(
    (id: string, updates: Partial<Pick<AnnotationArrow, "start" | "end">>) => {
      setHistory((previous) =>
        previous.map((item) => {
          if (item.kind !== "arrow" || item.value.id !== id) {
            return item;
          }

          return {
            ...item,
            value: {
              ...item.value,
              ...updates,
            },
          };
        }),
      );
    },
    [],
  );

  const updateShape = useCallback(
    (
      kind: ShapeTool,
      id: string,
      updates: Partial<Pick<AnnotationShape, "start" | "end">>,
    ) => {
      setHistory((previous) =>
        previous.map((item) => {
          if (item.kind !== kind || item.value.id !== id) {
            return item;
          }

          return {
            ...item,
            value: {
              ...item.value,
              ...updates,
            },
          };
        }),
      );
    },
    [],
  );

  const finishEdit = useCallback(() => {
    const originalHistory = editSnapshotRef.current;

    if (originalHistory === null) return;

    editSnapshotRef.current = null;

    const getEditableGeometry = (items: AnnotationItem[]) =>
      items
        .filter(
          (item) =>
            item.kind === "arrow" ||
            item.kind === "rectangle" ||
            item.kind === "circle",
        )
        .map((item) => ({
          kind: item.kind,
          id: item.value.id,
          start: item.value.start,
          end: item.value.end,
        }));

    const changed =
      JSON.stringify(getEditableGeometry(originalHistory)) !==
      JSON.stringify(getEditableGeometry(history));

    if (changed) {
      setUndoStack((previous) => [...previous, { history: originalHistory }]);
      setRedoStack([]);
    }
  }, [history]);

  const startText = useCallback(
    (
      point: Point,
      color: string,
      fontSize: number,
      fontWeight: "normal" | "bold",
    ) => {
      setActiveStroke(null);
      setActiveArrow(null);
      setActiveRectangle(null);
      setActiveCircle(null);

      setActiveText({
        id: crypto.randomUUID(),
        x: point.x,
        y: point.y,
        text: "",
        color,
        fontSize,
        fontWeight,
        width: 250,
      });
    },
    [],
  );

  const updateActiveText = useCallback((updates: Partial<AnnotationText>) => {
    setActiveText((current) => (current ? { ...current, ...updates } : null));
  }, []);

  const updateText = useCallback(
    (id: string, updates: Partial<AnnotationText>) => {
      setHistory((previous) =>
        previous.map((item) =>
          item.kind === "text" && item.value.id === id
            ? { ...item, value: { ...item.value, ...updates } }
            : item,
        ),
      );
    },
    [],
  );

  const finishText = useCallback(() => {
    if (activeText?.text.trim()) {
      setUndoStack((previous) => [...previous, { history }]);
      setRedoStack([]);

      setHistory((previous) => [
        ...previous,
        { kind: "text", value: activeText },
      ]);
    }

    setActiveText(null);
  }, [activeText, history]);

  const cancelText = useCallback(() => {
    setActiveText(null);
  }, []);

  const beginErase = useCallback(() => {
    if (eraseSnapshotRef.current !== null) return;

    eraseSnapshotRef.current = history;
    hasErasedAnnotationsRef.current = false;
  }, [history]);

  const eraseAnnotations = useCallback((ids: string[]) => {
    if (ids.length === 0) return;

    setHistory((previous) => {
      const idSet = new Set(ids);

      const next = previous.filter((item) => !idSet.has(item.value.id));

      if (next.length !== previous.length) {
        hasErasedAnnotationsRef.current = true;
      }

      return next;
    });
  }, []);

  const finishErase = useCallback(() => {
    const originalHistory = eraseSnapshotRef.current;

    if (originalHistory === null) return;

    if (hasErasedAnnotationsRef.current) {
      setUndoStack((previous) => [...previous, { history: originalHistory }]);
      setRedoStack([]);
    }

    eraseSnapshotRef.current = null;
    hasErasedAnnotationsRef.current = false;
  }, []);

  const deleteAnnotation = useCallback(
    (id: string) => {
      const exists = history.some((item) => item.value.id === id);

      if (!exists) return;

      setUndoStack((previous) => [...previous, { history }]);
      setRedoStack([]);
      setHistory((previous) => previous.filter((item) => item.value.id !== id));
    },
    [history],
  );

  const copyAnnotation = useCallback(
    (id: string) => {
      const item = history.find((annotation) => annotation.value.id === id);

      if (!item || item.kind === "stroke") return;

      clipboardRef.current = structuredClone(item);
    },
    [history],
  );

  const pasteAnnotation = useCallback(
    (position: Point) => {
      const copiedItem = clipboardRef.current;

      if (!copiedItem) return null;

      const id = crypto.randomUUID();

      let pastedItem: Exclude<AnnotationItem, { kind: "stroke" }>;

      switch (copiedItem.kind) {
        case "arrow": {
          const center = {
            x: (copiedItem.value.start.x + copiedItem.value.end.x) / 2,
            y: (copiedItem.value.start.y + copiedItem.value.end.y) / 2,
          };

          const dx = position.x - center.x;
          const dy = position.y - center.y;

          pastedItem = {
            kind: "arrow",
            value: {
              ...copiedItem.value,
              id,
              start: {
                x: copiedItem.value.start.x + dx,
                y: copiedItem.value.start.y + dy,
              },
              end: {
                x: copiedItem.value.end.x + dx,
                y: copiedItem.value.end.y + dy,
              },
            },
          };
          break;
        }

        case "rectangle": {
          const center = {
            x: (copiedItem.value.start.x + copiedItem.value.end.x) / 2,
            y: (copiedItem.value.start.y + copiedItem.value.end.y) / 2,
          };

          const dx = position.x - center.x;
          const dy = position.y - center.y;

          pastedItem = {
            kind: "rectangle",
            value: {
              ...copiedItem.value,
              id,
              start: {
                x: copiedItem.value.start.x + dx,
                y: copiedItem.value.start.y + dy,
              },
              end: {
                x: copiedItem.value.end.x + dx,
                y: copiedItem.value.end.y + dy,
              },
            },
          };
          break;
        }

        case "circle": {
          const center = {
            x: (copiedItem.value.start.x + copiedItem.value.end.x) / 2,
            y: (copiedItem.value.start.y + copiedItem.value.end.y) / 2,
          };

          const dx = position.x - center.x;
          const dy = position.y - center.y;

          pastedItem = {
            kind: "circle",
            value: {
              ...copiedItem.value,
              id,
              start: {
                x: copiedItem.value.start.x + dx,
                y: copiedItem.value.start.y + dy,
              },
              end: {
                x: copiedItem.value.end.x + dx,
                y: copiedItem.value.end.y + dy,
              },
            },
          };
          break;
        }

        case "text": {
          const dx = position.x - copiedItem.value.x;
          const dy = position.y - copiedItem.value.y;

          pastedItem = {
            kind: "text",
            value: {
              ...copiedItem.value,
              id,
              x: copiedItem.value.x + dx,
              y: copiedItem.value.y + dy,
            },
          };
          break;
        }

        case "stroke":
          return null;
      }

      setUndoStack((previous) => [...previous, { history }]);
      setRedoStack([]);
      setHistory((previous) => [...previous, pastedItem]);

      return {
        kind: pastedItem.kind,
        id,
      };
    },
    [history],
  );

  const applyCrop = useCallback(
    (crop: CropRect, previousScreenshot: string) => {
      // Finish any temporary drawing/editing state before cropping.
      setActiveStroke(null);
      setActiveArrow(null);
      setActiveRectangle(null);
      setActiveCircle(null);
      setActiveText(null);

      editSnapshotRef.current = null;
      eraseSnapshotRef.current = null;
      hasErasedAnnotationsRef.current = false;

      // Store the image and annotation snapshot as one undo operation.
      setUndoStack((previous) => [
        ...previous,
        {
          history,
          screenshot: previousScreenshot,
        },
      ]);
      setRedoStack([]);

      setHistory((previous) =>
        previous.reduce<AnnotationItem[]>((result, item) => {
          const transformed = cropAnnotation(item, crop);

          if (transformed) {
            result.push(transformed);
          }

          return result;
        }, []),
      );
    },
    [history],
  );

  const undo = useCallback(
    (currentScreenshot: string): string | null => {
      if (editSnapshotRef.current !== null || eraseSnapshotRef.current) {
        return null;
      }

      if (undoStack.length === 0) return null;

      const previousEntry = undoStack[undoStack.length - 1];

      // Save current state so Redo can restore it.
      setRedoStack((previous) => [
        ...previous,
        { history, screenshot: currentScreenshot },
      ]);

      setHistory(previousEntry.history);
      setUndoStack((previous) => previous.slice(0, -1));

      return previousEntry.screenshot ?? null;
    },
    [undoStack, history],
  );

  const redo = useCallback(
    (currentScreenshot: string): string | null => {
      if (editSnapshotRef.current !== null || eraseSnapshotRef.current) {
        return null;
      }

      if (redoStack.length === 0) return null;

      const nextEntry = redoStack[redoStack.length - 1];

      setUndoStack((previous) => [
        ...previous,
        { history, screenshot: currentScreenshot },
      ]);

      setHistory(nextEntry.history);
      setRedoStack((previous) => previous.slice(0, -1));

      return nextEntry.screenshot ?? null;
    },
    [redoStack, history],
  );

  return {
    strokes,
    arrows,
    rectangles,
    circles,
    activeStroke,
    activeArrow,
    activeRectangle,
    activeCircle,
    startStroke,
    continueStroke,
    finishStroke,
    cancelStroke,
    startArrow,
    continueArrow,
    finishArrow,
    cancelArrow,
    updateArrow,
    startShape,
    updateShape,
    continueShape,
    finishShape,
    cancelShape,
    beginEdit,
    finishEdit,
    texts,
    activeText,
    startText,
    updateActiveText,
    updateText,
    finishText,
    cancelText,
    beginErase,
    eraseAnnotations,
    finishErase,
    deleteAnnotation,
    applyCrop,
    copyAnnotation,
    pasteAnnotation,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
};
