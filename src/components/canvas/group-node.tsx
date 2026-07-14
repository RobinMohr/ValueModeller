import { memo, useCallback, useState } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '../../utils/cn';
import { useGraphStore } from '../../store/graph-store';
import type { SipocNode } from '../../types/sipoc.types';

const GROUP_COLORS = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-400' },
  { name: 'Green', value: 'green', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-400' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-400' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-400' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-400' },
  { name: 'Teal', value: 'teal', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-400' },
];

function getColorClasses(color: string) {
  return GROUP_COLORS.find((c) => c.value === color) ?? GROUP_COLORS[0];
}

export const GroupNodeComponent = memo(function GroupNodeComponent({
  data,
  id,
  selected,
}: NodeProps<SipocNode>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  const colorClasses = getColorClasses(data.color ?? 'blue');

  const handleDoubleClick = useCallback(() => {
    setEditValue(data.label);
    setIsEditing(true);
  }, [data.label]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      updateNodeData(id, { label: editValue.trim() });
    }
  }, [editValue, data.label, id, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setEditValue(data.label);
        setIsEditing(false);
      }
    },
    [data.label]
  );

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed min-w-[300px] min-h-[200px] w-full h-full relative',
        colorClasses.bg,
        colorClasses.border,
        selected && 'ring-2 ring-offset-2 dark:ring-offset-gray-900',
        selected && colorClasses.ring
      )}
      aria-label={`Group: ${data.label}. Drag process nodes inside to group them.`}
      aria-roledescription="swimlane group"
    >
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-primary-400"
        handleClassName="!w-3 !h-3 !bg-primary-400 !border-primary-600"
      />
      <div
        className={cn(
          'absolute top-0 left-0 right-0 px-3 py-2 rounded-t-lg flex items-center gap-2',
          colorClasses.border,
          'border-b-2 border-dashed'
        )}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          className={cn('w-4 h-4 flex-shrink-0', colorClasses.text)}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              'text-sm font-semibold bg-transparent border-none outline-none w-full',
              colorClasses.text
            )}
            autoFocus
          />
        ) : (
          <span className={cn('text-sm font-semibold cursor-text', colorClasses.text)}>
            {data.label || 'Untitled Group'}
          </span>
        )}
      </div>
    </div>
  );
});

export { GROUP_COLORS };
