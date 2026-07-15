import { useState, useRef, useEffect, useCallback } from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { useGraphStore } from '../../store/graph-store';

export interface EdgeLabelEditorProps {
  edgeId: string;
  label: string;
  labelX: number;
  labelY: number;
}

/**
 * Shared inline label editor for edge components.
 * Encapsulates editing state, input rendering, and commit logic.
 * Renders inside an EdgeLabelRenderer positioned at (labelX, labelY).
 * Supports double-click to edit, Enter to commit, Escape to cancel.
 */
export function EdgeLabelEditor({
  edgeId,
  label,
  labelX,
  labelY,
}: EdgeLabelEditorProps) {
  const updateEdgeData = useGraphStore((s) => s.updateEdgeData);

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
    updateEdgeData(edgeId, { label: trimmed });
    setIsEditing(false);
  }, [editValue, edgeId, updateEdgeData]);

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
  );
}
