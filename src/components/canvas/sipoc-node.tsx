import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SipocNode } from '../../types/sipoc.types';
import { cn } from '../../utils/cn';
import { useUiStore } from '../../store/ui-store';

export const SipocNodeComponent = memo(function SipocNodeComponent({
  data,
  id,
  selected,
}: NodeProps<SipocNode>) {
  const openSidePanel = useUiStore((s) => s.openSidePanel);

  const totalItems =
    data.suppliers.length +
    data.inputs.length +
    data.outputs.length +
    data.customers.length;

  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-white px-4 py-3 shadow-md transition-all min-w-[180px]',
        selected
          ? 'border-primary-500 ring-2 ring-primary-200'
          : 'border-gray-200 hover:border-primary-300'
      )}
      onDoubleClick={() => openSidePanel(id)}
      role="button"
      aria-label={`Process node: ${data.label}. Double-click to edit.`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSidePanel(id);
        }
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary-400 !border-primary-600"
      />

      <div className="flex flex-col gap-1">
        <div className="font-semibold text-gray-900 text-sm truncate">
          {data.label || 'Untitled Process'}
        </div>
        {data.processDescription && (
          <div className="text-xs text-gray-500 truncate max-w-[160px]">
            {data.processDescription}
          </div>
        )}
        <div className="flex gap-2 mt-1">
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
            S:{data.suppliers.length}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700">
            I:{data.inputs.length}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">
            O:{data.outputs.length}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
            C:{data.customers.length}
          </span>
        </div>
        {totalItems === 0 && (
          <div className="text-xs text-gray-400 italic mt-1">
            Double-click to add details
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary-400 !border-primary-600"
      />
    </div>
  );
});
