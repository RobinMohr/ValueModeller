import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

export interface LabeledEdgeData {
  [key: string]: unknown;
}

/**
 * A smooth step edge component.
 * Wrapped in React.memo per React Flow performance guide to prevent unnecessary
 * re-renders during drag/pan/zoom when edge props haven't changed.
 */
export const LabeledEdge = memo(function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{ ...style, strokeWidth: 2 }}
    />
  );
});
