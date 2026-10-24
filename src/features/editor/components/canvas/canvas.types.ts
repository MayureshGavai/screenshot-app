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
    }
  | {
      kind: "text";
      id: string;
    };

export type DragTarget = EditableAnnotation & {
  endpoint: DragEndpoint;
};

export type DragOrigin = {
  pointer: Point;
  start?: Point;
  end?: Point;
  x?: number;
  y?: number;
};

export type ShapeTool = "rectangle" | "circle";

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

export type CropDrag =
  | {
      type: "move";
      startPointer: Point;
      startRect: CropRect;
    }
  | {
      type: "resize";
      handle: CropResizeHandle;
      startPointer: Point;
      startRect: CropRect;
    };
