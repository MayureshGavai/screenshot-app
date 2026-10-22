import type { AnnotationRectangle } from "../../types/editor.types";
import { getShapeBounds } from "../canvas/canvas.utils";

type RectangleShapeProps = {
  rectangle: AnnotationRectangle;
};

const RectangleShape = ({ rectangle }: RectangleShapeProps) => {
  const bounds = getShapeBounds(rectangle);

  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill="none"
      stroke={rectangle.color}
      strokeWidth={rectangle.width}
    />
  );
};

export default RectangleShape;
