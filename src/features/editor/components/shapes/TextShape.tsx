import type { AnnotationText } from "../../types/editor.types";

type TextShapeProps = {
  annotation: AnnotationText;
};

const TextShape = ({ annotation }: TextShapeProps) => {
  const lines = annotation.text.split("\n");

  return (
    <text
      x={annotation.x}
      y={annotation.y + annotation.fontSize}
      fill={annotation.color}
      fontSize={annotation.fontSize}
      fontWeight={annotation.fontWeight}
      fontFamily="Inter, sans-serif"
      pointerEvents="none"
    >
      {lines.map((line, index) => (
        <tspan
          key={`${annotation.id}-${index}`}
          x={annotation.x}
          dy={index === 0 ? 0 : annotation.fontSize * 1.2}
        >
          {line || " "}
        </tspan>
      ))}
    </text>
  );
};

export default TextShape;
