import { useCallback, useState } from "react";
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
  const [activeStroke, setActiveStroke] = useState<AnnotationStroke | null>(
    null,
  );
  const [activeArrow, setActiveArrow] = useState<AnnotationArrow | null>(null);

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
      setHistory((previous) => [
        ...previous,
        { kind: "stroke", value: activeStroke },
      ]);
    }

    setActiveStroke(null);
  }, [activeStroke]);

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
        setHistory((previous) => [
          ...previous,
          { kind: "arrow", value: activeArrow },
        ]);
      }
    }

    setActiveArrow(null);
  }, [activeArrow]);

  const cancelStroke = useCallback(() => {
    setActiveStroke(null);
  }, []);

  const cancelArrow = useCallback(() => {
    setActiveArrow(null);
  }, []);

  const undo = useCallback(() => {
    setHistory((previous) => previous.slice(0, -1));
  }, []);

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
    undo,
    canUndo: history.length > 0,
  };
};
