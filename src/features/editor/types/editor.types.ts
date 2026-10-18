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
