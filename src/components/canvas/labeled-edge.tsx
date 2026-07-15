import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { EdgeLabelEditor } from './edge-label-editor';

export interface LabeledEdgeData {
  label?: string;
  [key: string]: unknown;
}

/**
 * A labeled edge component with inline double-click editing support.
 * Uses the shared EdgeLabelEditor for label rendering and editing.
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
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as LabeledEdgeData | undefined;
  const label = edgeData?.label ?? '';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: 2 }}
      />
      <EdgeLabelEditor
        edgeId={id}
        label={label}
        labelX={labelX}
        labelY={labelY}
      />
    </>
  );
});
