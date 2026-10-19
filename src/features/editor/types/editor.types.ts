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

export type Penstroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
};
