import { memo, useState, useRef, useCallback } from 'react';
import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react';
import type { SipocNode } from '../../types/sipoc.types';
import { cn } from '../../utils/cn';
import { useUiStore } from '../../store/ui-store';
import { useGraphKeyboardNav } from '../../hooks/use-graph-keyboard-nav';

function countLines(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.split('\n').filter((line) => line.trim() !== '').length;
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + '…';
}

type CompletionStatus = 'empty' | 'partial' | 'complete';

function getCompletionStatus(
  supplierCount: number,
  inputCount: number,
  outputCount: number,
  customerCount: number
): CompletionStatus {
  const filledFields = [supplierCount, inputCount, outputCount, customerCount].filter(
    (count) => count > 0
  ).length;
  if (filledFields === 0) return 'empty';
  if (filledFields === 4) return 'complete';
  return 'partial';
}

const completionBorderColor: Record<CompletionStatus, string> = {
  empty: 'border-l-gray-300',
  partial: 'border-l-blue-400',
  complete: 'border-l-green-500',
};

const completionLabel: Record<CompletionStatus, string> = {
  empty: 'No SIPOC details filled',
  partial: 'Partially filled',
  complete: 'All SIPOC fields filled',
};

export const SipocNodeComponent = memo(function SipocNodeComponent({
  data,
  id,
  selected,
}: NodeProps<SipocNode>) {
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const { handleNodeKeyDown } = useGraphKeyboardNav();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supplierCount = countLines(data.suppliers);
  const inputCount = countLines(data.inputs);
  const outputCount = countLines(data.outputs);
  const customerCount = countLines(data.customers);
  const totalItems = supplierCount + inputCount + outputCount + customerCount;
  const completionStatus = getCompletionStatus(supplierCount, inputCount, outputCount, customerCount);

  const hasMetrics = Boolean(data.cycleTime || data.leadTime || data.valueAddPercent);
  const hasContent = totalItems > 0 || Boolean(data.processDescription);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  }, []);

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-l-4 bg-white dark:bg-gray-800 px-4 py-3 shadow-md transition-all min-w-[180px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
        completionBorderColor[completionStatus],
        selected
          ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
          : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
      )}
      onDoubleClick={() => openSidePanel(id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-label={`Process node: ${data.label}. ${completionLabel[completionStatus]}. ${hasMetrics ? `Metrics: ${data.cycleTime ? `Cycle Time ${data.cycleTime}m` : ''}${data.leadTime ? `, Lead Time ${data.leadTime}m` : ''}${data.valueAddPercent ? `, Value Add ${data.valueAddPercent}%` : ''}. ` : ''}Use arrow keys to navigate between connected nodes. Enter to edit.`}
      aria-roledescription="process node"
      tabIndex={0}
      onKeyDown={(e) => handleNodeKeyDown(e, id)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary-400 !border-primary-600"
        aria-label="Input connection handle"
      />

      {/* Hover Tooltip */}
      <NodeToolbar
        isVisible={isHovered && !selected && hasContent}
        position={Position.Bottom}
        offset={8}
        align="center"
      >
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 max-w-[280px] text-left pointer-events-none"
          role="tooltip"
          aria-label={`SIPOC preview for ${data.label}`}
        >
          {/* Process description */}
          {data.processDescription && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
              {truncate(data.processDescription, 100)}
            </p>
          )}

          {/* SIPOC summary grid */}
          {totalItems > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              {supplierCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-blue-600 dark:text-blue-400">S</span>
                  <span className="text-gray-600 dark:text-gray-400">{supplierCount} supplier{supplierCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {inputCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-green-600 dark:text-green-400">I</span>
                  <span className="text-gray-600 dark:text-gray-400">{inputCount} input{inputCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {outputCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-orange-600 dark:text-orange-400">O</span>
                  <span className="text-gray-600 dark:text-gray-400">{outputCount} output{outputCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {customerCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-purple-600 dark:text-purple-400">C</span>
                  <span className="text-gray-600 dark:text-gray-400">{customerCount} customer{customerCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          {/* Metrics */}
          {hasMetrics && (
            <div className={cn('flex gap-2 flex-wrap', totalItems > 0 ? 'mt-2 pt-2 border-t border-gray-100 dark:border-gray-700' : '')}>
              {data.cycleTime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  CT: {data.cycleTime}m
                </span>
              )}
              {data.leadTime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  LT: {data.leadTime}m
                </span>
              )}
              {data.valueAddPercent && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  VA: {data.valueAddPercent}%
                </span>
              )}
            </div>
          )}

          {/* Hint */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">
            Click to view full details
          </p>
        </div>
      </NodeToolbar>

      <div className="flex flex-col gap-1">
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
          {data.label || 'Untitled Process'}
        </div>
        {data.processDescription && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
            {data.processDescription}
          </div>
        )}
        <div className="flex gap-2 mt-1" aria-label={`SIPOC counts: ${supplierCount} suppliers, ${inputCount} inputs, ${outputCount} outputs, ${customerCount} customers`}>
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" aria-hidden="true">
            S:{supplierCount}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" aria-hidden="true">
            I:{inputCount}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" aria-hidden="true">
            O:{outputCount}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" aria-hidden="true">
            C:{customerCount}
          </span>
        </div>
        {hasMetrics && (
          <div className="flex gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700" aria-hidden="true">
            {data.cycleTime && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" title="Cycle Time">
                CT: {data.cycleTime}m
              </span>
            )}
            {data.leadTime && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" title="Lead Time">
                LT: {data.leadTime}m
              </span>
            )}
            {data.valueAddPercent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" title="Value Add %">
                VA: {data.valueAddPercent}%
              </span>
            )}
          </div>
        )}
        {totalItems === 0 && (
          <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
            Click to add details
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary-400 !border-primary-600"
        aria-label="Output connection handle"
      />
    </div>
  );
});
