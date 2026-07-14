import { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { useGraphStore } from '../../store/graph-store';
import { getObstructingNodes, computeSmartPath } from '../../utils/edge-routing';

export interface SmartEdgeData {
  label?: string;
  [key: string]: unknown;
}

/**
 * A smart edge component that automatically routes around intermediate nodes.
 * Falls back to standard smooth step path when no obstructions are detected.
 * Supports inline label editing (double-click).
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
  const updateEdgeData = useGraphStore((s) => s.updateEdgeData);

  const edgeData = data as SmartEdgeData | undefined;
  const label = edgeData?.label ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(label);
  }, [label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    updateEdgeData(id, { label: trimmed });
    setIsEditing(false);
  }, [editValue, id, updateEdgeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        setEditValue(label);
        setIsEditing(false);
      }
    },
    [commitEdit, label]
  );

  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

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
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onDoubleClick={handleDoubleClick}
          className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 backdrop-blur-sm cursor-pointer dark:bg-gray-800/90 dark:text-gray-200 dark:border-gray-600"
          title={isEditing ? undefined : 'Double-click to edit label'}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-24 bg-transparent text-xs font-medium text-gray-700 outline-none border-b border-indigo-400 dark:text-gray-200"
              aria-label="Edge label"
            />
          ) : (
            <span>{label ? `${label} →` : '(click to label)'}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
