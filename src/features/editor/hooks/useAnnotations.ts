import { useCallback, useRef, useState } from "react";
import type {
  AnnotationArrow,
  AnnotationStroke,
  Point,
} from "../types/editor.types";

type StrokeTool = AnnotationStroke["tool"];

type AnnotationItem =
  | { kind: "stroke"; value: AnnotationStroke }
  | { kind: "arrow"; value: AnnotationArrow };

export const useAnnotations = () => {
  const [history, setHistory] = useState<AnnotationItem[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationItem[][]>([]);

  const [activeStroke, setActiveStroke] = useState<AnnotationStroke | null>(
    null,
  );
  const [activeArrow, setActiveArrow] = useState<AnnotationArrow | null>(null);

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

  const startStroke = useCallback(
    (point: Point, color: string, width: number, tool: StrokeTool) => {
      setActiveArrow(null);
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

  const cancelStroke = useCallback(() => {
    setActiveStroke(null);
  }, []);

  const cancelArrow = useCallback(() => {
    setActiveArrow(null);
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

    const originalArrowGeometry = originalHistory
      .filter(
        (item): item is Extract<AnnotationItem, { kind: "arrow" }> =>
          item.kind === "arrow",
      )
      .map(({ value }) => ({
        id: value.id,
        start: value.start,
        end: value.end,
      }));

    const currentArrowGeometry = history
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
      JSON.stringify(originalArrowGeometry) !==
      JSON.stringify(currentArrowGeometry);

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
    activeStroke,
    activeArrow,
    startStroke,
    continueStroke,
    finishStroke,
    cancelStroke,
    startArrow,
    continueArrow,
    finishArrow,
    cancelArrow,
    updateArrow,
    beginArrowEdit,
    finishArrowEdit,
    undo,
    canUndo: undoStack.length > 0,
  };
};
