export type EditorTool =
  | "select"
  | "crop"
  | "pen"
  | "highlighter"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text";

export type EditorToolConfig = {
  id: EditorTool;
  label: string;
};

export type Point = {
  x: number;
  y: number;
};

export type AnnotationStroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  tool: "pen" | "highlighter";
};

export type AnnotationArrow = {
  id: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
};

export type AnnotationRectangle = {
  id: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
};

export type AnnotationCircle = {
  id: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
};
