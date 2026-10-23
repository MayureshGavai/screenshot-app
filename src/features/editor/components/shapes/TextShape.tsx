import { useLayoutEffect, useRef, useState } from "react";
import type { AnnotationText } from "../../types/editor.types";

export type TextBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextShapeProps = {
  annotation: AnnotationText;
  selected?: boolean;
  onBoundsChange?: (id: string, bounds: TextBounds) => void;
};

const TextShape = ({
  annotation,
  selected,
  onBoundsChange,
}: TextShapeProps) => {
  const lines = annotation.text.split("\n");
  const textRef = useRef<SVGTextElement>(null);

  const [textBounds, setTextBounds] = useState<TextBounds>({
    x: annotation.x,
    y: annotation.y,
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    if (!textRef.current) return;

    const bounds = textRef.current.getBBox();

    const measuredBounds = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };

    setTextBounds(measuredBounds);
    onBoundsChange?.(annotation.id, measuredBounds);
  }, [
    annotation.id,
    annotation.text,
    annotation.x,
    annotation.y,
    annotation.fontSize,
    annotation.fontWeight,
    onBoundsChange,
  ]);

  return (
    <g>
      {selected && (
        <rect
          x={textBounds.x - 4}
          y={textBounds.y - 4}
          width={textBounds.width + 8}
          height={textBounds.height + 8}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          pointerEvents="none"
        />
      )}

      <text
        ref={textRef}
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
    </g>
  );
};

export default TextShape;
