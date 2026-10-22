import type { Point } from "../../types/editor.types";

export type DragEndpoint = "start" | "end" | "move";

export type EditableAnnotation =
  | {
      kind: "arrow";
      id: string;
    }
  | {
      kind: "rectangle";
      id: string;
    }
  | {
      kind: "circle";
      id: string;
    };

export type DragTarget = EditableAnnotation & {
  endpoint: DragEndpoint;
};

export type DragOrigin = {
  pointer: Point;
  start: Point;
  end: Point;
};

export type ShapeTool = "rectangle" | "circle";
