import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { getObstructingNodes, computeSmartPath } from '../../utils/edge-routing';

export interface SmartEdgeData {
  [key: string]: unknown;
}

/**
 * A smart edge component that automatically routes around intermediate nodes.
 * Falls back to standard smooth step path when no obstructions are detected.
 * Wrapped in React.memo per React Flow performance guide to prevent unnecessary
 * re-renders during drag/pan/zoom when edge props haven't changed.
 */
export const SmartEdge = memo(function SmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const { getNodes } = useReactFlow();
  // Use imperative getNodes() to read current nodes at render time
  // without subscribing to the full nodes array (avoids re-renders on every node drag)
  const nodes = getNodes();

  // Detect obstructing nodes and compute smart path
  const sourcePoint = { x: sourceX, y: sourceY };
  const targetPoint = { x: targetX, y: targetY };

  const obstructing = getObstructingNodes(
    sourcePoint,
    targetPoint,
    nodes,
    source,
    target
  );

  let edgePath: string;

  if (obstructing.length > 0) {
    // Route around obstructing nodes
    const smartResult = computeSmartPath(sourcePoint, targetPoint, obstructing);
    edgePath = smartResult.path;
  } else {
    // No obstruction — use standard smooth step path
    const [defaultPath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    edgePath = defaultPath;
  }

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{ ...style, strokeWidth: 2 }}
    />
  );
});
