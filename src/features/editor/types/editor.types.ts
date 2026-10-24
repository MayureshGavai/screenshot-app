export type EditorTool =
  | "select"
  | "crop"
  | "pen"
  | "highlighter"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "eraser";

export type EditorToolConfig = {
  id: EditorTool;
  label: string;
};

export type Point = {
  x: number;
  y: number;
};

export type AnnotationFill = {
  color: string;
  opacity: number;
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
  fill: AnnotationFill | null;
};

export type AnnotationCircle = {
  id: string;
  start: Point;
  end: Point;
  color: string;
  width: number;
  fill: AnnotationFill | null;
};

export type AnnotationText = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  width: number;
};
