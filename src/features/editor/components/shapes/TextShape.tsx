import type { AnnotationText } from "../../types/editor.types";

type TextShapeProps = {
  annotation: AnnotationText;
};

const TextShape = ({ annotation }: TextShapeProps) => {
  return (
    <text
      x={annotation.x}
      y={annotation.y}
      fill={annotation.color}
      fontSize={annotation.fontSize}
      fontWeight={annotation.fontWeight}
      style={{ userSelect: "none" }}
    >
      {annotation.text}
    </text>
  );
};

export default TextShape;
