import type { AnnotationArrow } from "../../types/editor.types";

type ArrowShapeProps = {
  arrow: AnnotationArrow;
};

const ArrowShape = ({ arrow }: ArrowShapeProps) => {
  const { start, end, color, width } = arrow;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  const headLength = Math.max(12, width * 3);
  const headAngle = Math.PI / 6;

  const leftX = end.x - headLength * Math.cos(angle - headAngle);
  const leftY = end.y - headLength * Math.sin(angle - headAngle);

  const rightX = end.x - headLength * Math.cos(angle + headAngle);
  const rightY = end.y - headLength * Math.sin(angle + headAngle);

  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />

      <polyline
        points={`${leftX},${leftY} ${end.x},${end.y} ${rightX},${rightY}`}
      />
    </g>
  );
};

export default ArrowShape;
