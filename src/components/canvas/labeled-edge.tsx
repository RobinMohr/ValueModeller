import { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useGraphStore } from '../../store/graph-store';

export interface LabeledEdgeData {
  label?: string;
  [key: string]: unknown;
}

/**
 * A labeled edge component with inline double-click editing support.
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

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEdgeData = useGraphStore((s) => s.updateEdgeData);

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
          className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm border border-gray-200 backdrop-blur-sm cursor-pointer"
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
              className="w-24 bg-transparent text-xs font-medium text-gray-700 outline-none border-b border-indigo-400"
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
