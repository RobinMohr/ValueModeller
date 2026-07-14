/**
 * Smart edge routing utilities.
 *
 * Provides functions to detect if a straight/smoothstep edge path would
 * pass through intermediate nodes, and to compute alternative waypoints
 * that route around them using orthogonal segments.
 */

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/** Padding around node bounding boxes for routing clearance */
const NODE_PADDING = 20;

/**
 * Expands a rectangle by a given padding in all directions.
 */
function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/**
 * Checks if a line segment from p1 to p2 intersects a rectangle.
 * Uses the Liang-Barsky line clipping algorithm for efficiency.
 */
function lineIntersectsRect(p1: Point, p2: Point, rect: Rect): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  let tMin = 0;
  let tMax = 1;

  const edges = [
    { p: -dx, q: -(left - p1.x) },
    { p: dx, q: right - p1.x },
    { p: -dy, q: -(top - p1.y) },
    { p: dy, q: bottom - p1.y },
  ];

  for (const { p, q } of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        tMin = Math.max(tMin, t);
      } else {
        tMax = Math.min(tMax, t);
      }
      if (tMin > tMax) return false;
    }
  }

  return tMin <= tMax;
}

/**
 * Gets nodes whose bounding boxes are intersected by the direct line
 * between source and target handles, excluding the source and target nodes.
 */
export function getObstructingNodes(
  sourcePoint: Point,
  targetPoint: Point,
  allNodes: { id: string; position: Point; measured?: { width?: number; height?: number } }[],
  sourceId: string,
  targetId: string
): { id: string; rect: Rect }[] {
  const obstructing: { id: string; rect: Rect }[] = [];

  for (const node of allNodes) {
    if (node.id === sourceId || node.id === targetId) continue;

    const width = node.measured?.width ?? 200;
    const height = node.measured?.height ?? 80;
    const rect: Rect = {
      x: node.position.x,
      y: node.position.y,
      width,
      height,
    };

    const expandedRect = expandRect(rect, NODE_PADDING);

    if (lineIntersectsRect(sourcePoint, targetPoint, expandedRect)) {
      obstructing.push({ id: node.id, rect });
    }
  }

  return obstructing;
}

/**
 * Computes a routed SVG path that avoids obstructing nodes.
 * 
 * Strategy:
 * - For a left-to-right flow, if nodes are in the way, route above or below them.
 * - Choose the direction (above vs below) that requires less deviation.
 * - Use smooth rounded corners for visual polish.
 */
export function computeSmartPath(
  sourcePoint: Point,
  targetPoint: Point,
  obstructingNodes: { id: string; rect: Rect }[],
): { path: string; labelX: number; labelY: number } {
  if (obstructingNodes.length === 0) {
    // No obstruction — just return a simple straight path (shouldn't be called in this case)
    const midX = (sourcePoint.x + targetPoint.x) / 2;
    const midY = (sourcePoint.y + targetPoint.y) / 2;
    return {
      path: `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`,
      labelX: midX,
      labelY: midY,
    };
  }

  // Calculate the combined bounding box of all obstructing nodes (with padding)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { rect } of obstructingNodes) {
    const expanded = expandRect(rect, NODE_PADDING);
    minX = Math.min(minX, expanded.x);
    minY = Math.min(minY, expanded.y);
    maxX = Math.max(maxX, expanded.x + expanded.width);
    maxY = Math.max(maxY, expanded.y + expanded.height);
  }

  // Determine if routing above or below is shorter
  const sourceCenter = sourcePoint.y;
  const targetCenter = targetPoint.y;
  const avgY = (sourceCenter + targetCenter) / 2;

  const distToTop = Math.abs(avgY - minY);
  const distToBottom = Math.abs(maxY - avgY);

  // Route above or below the obstacle block
  const routeY = distToTop <= distToBottom
    ? minY - NODE_PADDING  // Route above
    : maxY + NODE_PADDING; // Route below

  // Compute the midpoint for the horizontal routing
  const exitX = Math.max(sourcePoint.x + 30, minX - NODE_PADDING);
  const entryX = Math.min(targetPoint.x - 30, maxX + NODE_PADDING);

  // Build the waypoints for orthogonal routing
  const waypoints: Point[] = [
    sourcePoint,
    { x: exitX, y: sourcePoint.y },
    { x: exitX, y: routeY },
    { x: entryX, y: routeY },
    { x: entryX, y: targetPoint.y },
    targetPoint,
  ];

  // Generate SVG path with rounded corners
  const path = generateRoundedPath(waypoints, 8);

  // Label position at the middle waypoint (horizontal segment)
  const labelX = (exitX + entryX) / 2;
  const labelY = routeY;

  return { path, labelX, labelY };
}

/**
 * Generates an SVG path string with rounded corners at waypoints.
 */
function generateRoundedPath(points: Point[], radius: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate vectors from current point to prev and next
    const dxPrev = curr.x - prev.x;
    const dyPrev = curr.y - prev.y;
    const dxNext = next.x - curr.x;
    const dyNext = next.y - curr.y;

    const distPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
    const distNext = Math.sqrt(dxNext * dxNext + dyNext * dyNext);

    // Limit radius to half the shortest segment
    const r = Math.min(radius, distPrev / 2, distNext / 2);

    if (r <= 0 || distPrev === 0 || distNext === 0) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Point where the curve starts (on the incoming segment)
    const startX = curr.x - (dxPrev / distPrev) * r;
    const startY = curr.y - (dyPrev / distPrev) * r;

    // Point where the curve ends (on the outgoing segment)
    const endX = curr.x + (dxNext / distNext) * r;
    const endY = curr.y + (dyNext / distNext) * r;

    path += ` L ${startX} ${startY}`;
    path += ` Q ${curr.x} ${curr.y} ${endX} ${endY}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}
