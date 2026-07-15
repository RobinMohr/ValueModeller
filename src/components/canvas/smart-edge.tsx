import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { useGraphStore } from '../../store/graph-store';
import { getObstructingNodes, computeSmartPath } from '../../utils/edge-routing';
import { EdgeLabelEditor } from './edge-label-editor';

export interface SmartEdgeData {
  label?: string;
  [key: string]: unknown;
}

/**
 * A smart edge component that automatically routes around intermediate nodes.
 * Falls back to standard smooth step path when no obstructions are detected.
 * Supports inline label editing (double-click) via EdgeLabelEditor.
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
  data,
}: EdgeProps) {
  const { getNodes } = useReactFlow();
  const nodes = useGraphStore((s) => s.nodes);

  const edgeData = data as SmartEdgeData | undefined;
  const label = edgeData?.label ?? '';

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
  let labelX: number;
  let labelY: number;

  if (obstructing.length > 0) {
    // Route around obstructing nodes
    const smartResult = computeSmartPath(sourcePoint, targetPoint, obstructing);
    edgePath = smartResult.path;
    labelX = smartResult.labelX;
    labelY = smartResult.labelY;
  } else {
    // No obstruction — use standard smooth step path
    const [defaultPath, defaultLabelX, defaultLabelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    edgePath = defaultPath;
    labelX = defaultLabelX;
    labelY = defaultLabelY;
  }

  // Suppress unused variable warnings for getNodes (used to trigger re-render)
  void getNodes;

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
