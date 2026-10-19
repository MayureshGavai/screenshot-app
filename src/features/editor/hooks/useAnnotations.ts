import { useCallback, useState } from "react";
import type { Penstroke, Point } from "../types/editor.types";

export const useAnnotations = () => {
  const [strokes, setStrokes] = useState<Penstroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Penstroke | null>(null);

  const startStroke = useCallback(
    (point: Point, color: string, width: number) => {
      setActiveStroke({
        id: crypto.randomUUID(),
        points: [point],
        color,
        width,
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
