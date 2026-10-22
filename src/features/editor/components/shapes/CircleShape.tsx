import type { AnnotationCircle } from "../../types/editor.types";
import { getShapeBounds } from "../canvas/canvas.utils";

type CircleShapeProps = {
  circle: AnnotationCircle;
};

const CircleShape = ({ circle }: CircleShapeProps) => {
  const bounds = getShapeBounds(circle);

  return (
    <ellipse
      cx={bounds.x + bounds.width / 2}
      cy={bounds.y + bounds.height / 2}
      rx={bounds.width / 2}
      ry={bounds.height / 2}
      fill={circle.fill?.color ?? "none"}
      fillOpacity={circle.fill?.opacity ?? 1}
      stroke={circle.color}
      strokeWidth={circle.width}
    />
  );
};

export default CircleShape;
