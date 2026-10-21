import { useCallback, useRef, useState } from "react";
import type {
  AnnotationArrow,
  AnnotationStroke,
  AnnotationRectangle,
  AnnotationCircle,
  Point,
} from "../types/editor.types";

type StrokeTool = AnnotationStroke["tool"];

type AnnotationItem =
  | { kind: "stroke"; value: AnnotationStroke }
  | { kind: "arrow"; value: AnnotationArrow }
  | { kind: "rectangle"; value: AnnotationRectangle }
  | { kind: "circle"; value: AnnotationCircle };

type ShapeTool = "rectangle" | "circle";

type AnnotationShape = AnnotationRectangle | AnnotationCircle;

export const useAnnotations = () => {
  const [history, setHistory] = useState<AnnotationItem[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationItem[][]>([]);

  const [activeStroke, setActiveStroke] = useState<AnnotationStroke | null>(
    null,
  );
  const [activeArrow, setActiveArrow] = useState<AnnotationArrow | null>(null);

  const [activeRectangle, setActiveRectangle] =
    useState<AnnotationRectangle | null>(null);
  const [activeCircle, setActiveCircle] = useState<AnnotationCircle | null>(
    null,
  );

  const arrowEditSnapshotRef = useRef<AnnotationItem[] | null>(null);

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
      setUndoStack((previous) => [...previous, history]);
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
        setUndoStack((previous) => [...previous, history]);
        setHistory((previous) => [
          ...previous,
          { kind: "arrow", value: activeArrow },
        ]);
      }
    }

    setActiveArrow(null);
  }, [activeArrow, history]);

  const startShape = useCallback(
    (tool: ShapeTool, point: Point, color: string, width: number) => {
      setActiveStroke(null);
      setActiveArrow(null);

      const shape: AnnotationShape = {
        id: crypto.randomUUID(),
        start: point,
        end: point,
        color,
        width,
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
          setUndoStack((previous) => [...previous, history]);
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

  const beginArrowEdit = useCallback(() => {
    if (arrowEditSnapshotRef.current === null) {
      arrowEditSnapshotRef.current = history;
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

  const finishArrowEdit = useCallback(() => {
    const originalHistory = arrowEditSnapshotRef.current;

    if (originalHistory === null) return;

    arrowEditSnapshotRef.current = null;

    const getArrowGeometry = (items: AnnotationItem[]) =>
      items
        .filter(
          (item): item is Extract<AnnotationItem, { kind: "arrow" }> =>
            item.kind === "arrow",
        )
        .map(({ value }) => ({
          id: value.id,
          start: value.start,
          end: value.end,
        }));

    const changed =
      JSON.stringify(getArrowGeometry(originalHistory)) !==
      JSON.stringify(getArrowGeometry(history));

    if (changed) {
      setUndoStack((previous) => [...previous, originalHistory]);
    }
  }, [history]);

  const undo = useCallback(() => {
    if (arrowEditSnapshotRef.current !== null) return;

    if (undoStack.length === 0) return;

    const previousHistory = undoStack[undoStack.length - 1];

    setHistory(previousHistory);

    setUndoStack((previous) => previous.slice(0, -1));
  }, [undoStack]);

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
    continueShape,
    finishShape,
    cancelShape,
    beginArrowEdit,
    finishArrowEdit,
    undo,
    canUndo: undoStack.length > 0,
  };
};
