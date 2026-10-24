import type {
  AnnotationArrow,
  AnnotationCircle,
  AnnotationRectangle,
  AnnotationStroke,
  AnnotationText,
  Point,
} from "../../types/editor.types";

import type { EditableAnnotation } from "./canvas.types";
import { ARROW_HIT_DISTANCE } from "./canvas.constants";
import type { TextBounds } from "../shapes/TextShape";

export const distanceBetween = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distanceBetween(point, start);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  );

  return distanceBetween(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
  });
};

export const strokeToPath = (stroke: AnnotationStroke) =>
  stroke.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

export const getShapeBounds = (
  shape: AnnotationRectangle | AnnotationCircle,
) => ({
  x: Math.min(shape.start.x, shape.end.x),
  y: Math.min(shape.start.y, shape.end.y),
  width: Math.abs(shape.end.x - shape.start.x),
  height: Math.abs(shape.end.y - shape.start.y),
});

export const isPointNearRectangle = (
  point: Point,
  rectangle: AnnotationRectangle,
) => {
  const bounds = getShapeBounds(rectangle);
  const tolerance = ARROW_HIT_DISTANCE + rectangle.width / 2;

  const withinHorizontal =
    point.x >= bounds.x - tolerance &&
    point.x <= bounds.x + bounds.width + tolerance;

  const withinVertical =
    point.y >= bounds.y - tolerance &&
    point.y <= bounds.y + bounds.height + tolerance;

  const nearHorizontalEdge =
    Math.abs(point.y - bounds.y) <= tolerance ||
    Math.abs(point.y - (bounds.y + bounds.height)) <= tolerance;

  const nearVerticalEdge =
    Math.abs(point.x - bounds.x) <= tolerance ||
    Math.abs(point.x - (bounds.x + bounds.width)) <= tolerance;

  return (
    withinHorizontal &&
    withinVertical &&
    (nearHorizontalEdge || nearVerticalEdge)
  );
};

export const isPointNearCircle = (point: Point, circle: AnnotationCircle) => {
  const bounds = getShapeBounds(circle);

  if (bounds.width === 0 || bounds.height === 0) {
    return false;
  }

  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const cx = bounds.x + rx;
  const cy = bounds.y + ry;

  const normalizedDistance = Math.sqrt(
    ((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2,
  );

  const tolerance =
    (ARROW_HIT_DISTANCE + circle.width / 2) / Math.max(1, Math.min(rx, ry));

  return Math.abs(normalizedDistance - 1) <= tolerance;
};

export const isPointInsideRectangle = (
  point: Point,
  rectangle: AnnotationRectangle,
) => {
  const bounds = getShapeBounds(rectangle);

  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};

export const isPointInsideCircle = (point: Point, circle: AnnotationCircle) => {
  const bounds = getShapeBounds(circle);

  if (bounds.width === 0 || bounds.height === 0) {
    return false;
  }

  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const cx = bounds.x + rx;
  const cy = bounds.y + ry;

  return ((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2 <= 1;
};

export const isPointInsideText = (
  point: Point,
  annotation: AnnotationText,
  bounds?: TextBounds,
) => {
  if (!bounds) return false;

  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};

export const findAnnotationAtPoint = (
  point: Point,
  arrows: AnnotationArrow[],
  rectangles: AnnotationRectangle[],
  circles: AnnotationCircle[],
  texts: AnnotationText[],
  textBounds: Map<string, TextBounds>,
): EditableAnnotation | null => {
  // Check text annotations first because they are rendered above the shapes.
  for (const text of [...texts].reverse()) {
    const bounds = textBounds.get(text.id);

    if (isPointInsideText(point, text, bounds)) {
      return { kind: "text", id: text.id };
    }
  }

  for (const arrow of [...arrows].reverse()) {
    if (
      distanceToSegment(point, arrow.start, arrow.end) <=
      ARROW_HIT_DISTANCE + arrow.width / 2
    ) {
      return { kind: "arrow", id: arrow.id };
    }
  }

  for (const rectangle of [...rectangles].reverse()) {
    if (
      isPointInsideRectangle(point, rectangle) ||
      isPointNearRectangle(point, rectangle)
    ) {
      return { kind: "rectangle", id: rectangle.id };
    }
  }

  for (const circle of [...circles].reverse()) {
    if (
      isPointInsideCircle(point, circle) ||
      isPointNearCircle(point, circle)
    ) {
      return { kind: "circle", id: circle.id };
    }
  }

  return null;
};

const isPointNearStroke = (
  point: Point,
  stroke: AnnotationStroke,
  radius: number,
) => {
  const threshold = radius + stroke.width / 2;

  if (stroke.points.length === 1) {
    return distanceBetween(point, stroke.points[0]) <= threshold;
  }

  return stroke.points.some((current, index) => {
    if (index === 0) return false;

    return (
      distanceToSegment(point, stroke.points[index - 1], current) <= threshold
    );
  });
};

const isPointNearArrow = (
  point: Point,
  arrow: AnnotationArrow,
  radius: number,
) =>
  distanceToSegment(point, arrow.start, arrow.end) <= radius + arrow.width / 2;

const isPointNearRectangleForEraser = (
  point: Point,
  rectangle: AnnotationRectangle,
  radius: number,
) => {
  const bounds = getShapeBounds(rectangle);

  if (
    rectangle.fill &&
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  ) {
    return true;
  }

  const topLeft = { x: bounds.x, y: bounds.y };
  const topRight = { x: bounds.x + bounds.width, y: bounds.y };
  const bottomLeft = { x: bounds.x, y: bounds.y + bounds.height };
  const bottomRight = {
    x: bounds.x + bounds.width,
    y: bounds.y + bounds.height,
  };

  const threshold = radius + rectangle.width / 2;

  return [
    [topLeft, topRight],
    [topRight, bottomRight],
    [bottomRight, bottomLeft],
    [bottomLeft, topLeft],
  ].some(([start, end]) => distanceToSegment(point, start, end) <= threshold);
};

const isPointNearCircleForEraser = (
  point: Point,
  circle: AnnotationCircle,
  radius: number,
) => {
  const bounds = getShapeBounds(circle);

  if (bounds.width === 0 || bounds.height === 0) return false;

  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const cx = bounds.x + rx;
  const cy = bounds.y + ry;

  const normalizedDistance =
    ((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2;

  if (circle.fill && normalizedDistance <= 1) return true;

  const threshold = radius + circle.width / 2;
  const segments = 48;

  let previous = {
    x: cx + rx,
    y: cy,
  };

  for (let index = 1; index <= segments; index++) {
    const angle = (index / segments) * Math.PI * 2;

    const current = {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };

    if (distanceToSegment(point, previous, current) <= threshold) {
      return true;
    }

    previous = current;
  }

  return false;
};

export const findAnnotationsIntersectingEraser = (
  point: Point,
  radius: number,
  strokes: AnnotationStroke[],
  arrows: AnnotationArrow[],
  rectangles: AnnotationRectangle[],
  circles: AnnotationCircle[],
  texts: AnnotationText[],
  textBounds: Map<string, TextBounds>,
): string[] => {
  const matchedIds: string[] = [];

  for (const stroke of strokes) {
    if (isPointNearStroke(point, stroke, radius)) {
      matchedIds.push(stroke.id);
    }
  }

  for (const arrow of arrows) {
    if (isPointNearArrow(point, arrow, radius)) {
      matchedIds.push(arrow.id);
    }
  }

  for (const rectangle of rectangles) {
    if (isPointNearRectangleForEraser(point, rectangle, radius)) {
      matchedIds.push(rectangle.id);
    }
  }

  for (const circle of circles) {
    if (isPointNearCircleForEraser(point, circle, radius)) {
      matchedIds.push(circle.id);
    }
  }

  for (const text of texts) {
    const bounds = textBounds.get(text.id);

    if (!bounds) continue;

    const nearestX = Math.max(
      bounds.x,
      Math.min(point.x, bounds.x + bounds.width),
    );

    const nearestY = Math.max(
      bounds.y,
      Math.min(point.y, bounds.y + bounds.height),
    );

    if (distanceBetween(point, { x: nearestX, y: nearestY }) <= radius) {
      matchedIds.push(text.id);
    }
  }

  return matchedIds;
};
