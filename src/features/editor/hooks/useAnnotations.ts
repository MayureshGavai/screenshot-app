import { useCallback, useState } from "react";
import type { AnnotationStroke, Point } from "../types/editor.types";

type StrokeTool = AnnotationStroke["tool"];

export const useAnnotations = () => {
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<AnnotationStroke | null>(
    null,
  );

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
      setStrokes((previous) => [...previous, activeStroke]);
    }

    setActiveStroke(null);
  }, [activeStroke]);

  const cancelStroke = useCallback(() => {
    setActiveStroke(null);
  }, []);

  const undo = useCallback(() => {
    setStrokes((previous) => previous.slice(0, -1));
  }, []);

  return {
    strokes,
    activeStroke,
    startStroke,
    continueStroke,
    finishStroke,
    cancelStroke,
    undo,
    canUndo: strokes.length > 0,
  };
};
