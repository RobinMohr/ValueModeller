import { memo, useState, useRef, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SipocNode } from '../../types/sipoc.types';
import { cn } from '../../utils/cn';
import { useUiStore } from '../../store/ui-store';
import { useGraphKeyboardNav } from '../../hooks/use-graph-keyboard-nav';

function countLines(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.split('\n').filter((line) => line.trim() !== '').length;
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

interface SipocSectionProps {
  label: string;
  content: string;
  colorClass: string;
  darkColorClass: string;
}

function SipocSection({ label, content, colorClass, darkColorClass }: SipocSectionProps) {
  if (!content || !content.trim()) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('text-[10px] font-semibold uppercase tracking-wide', colorClass, darkColorClass)}>
        {label}
      </span>
      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
        {content.trim()}
      </p>
    </div>
  );
}

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
  const completionStatus = getCompletionStatus(supplierCount, inputCount, outputCount, customerCount);

  const hasMetrics = Boolean(data.cycleTime || data.leadTime || data.valueAddPercent);
  const hasContent = supplierCount > 0 || inputCount > 0 || outputCount > 0 || customerCount > 0 || Boolean(data.processDescription);

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

  // Suppress unused variable warning — isHovered is kept for potential future tooltip usage
  void isHovered;

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-l-4 bg-white dark:bg-gray-800 px-4 py-3 shadow-md transition-all min-w-[200px] max-w-[320px]',
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
      aria-label={`Step node: ${data.label}. ${completionLabel[completionStatus]}. ${hasMetrics ? `Metrics: ${data.cycleTime ? `Cycle Time ${data.cycleTime}m` : ''}${data.leadTime ? `, Lead Time ${data.leadTime}m` : ''}${data.valueAddPercent ? `, Value Add ${data.valueAddPercent}%` : ''}. ` : ''}Use arrow keys to navigate between connected nodes. Enter to edit.`}
      aria-roledescription="step node"
      tabIndex={0}
      onKeyDown={(e) => handleNodeKeyDown(e, id)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary-400 !border-primary-600"
        aria-label="Input connection handle"
      />

      <div className="flex flex-col gap-2">
        {/* Node title */}
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {data.label || 'Untitled Step'}
        </div>

        {/* Process description */}
        {data.processDescription && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {data.processDescription}
          </p>
        )}

        {/* Full SIPOC content sections */}
        {hasContent && (
          <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-gray-100 dark:border-gray-700">
            <SipocSection
              label="Suppliers"
              content={data.suppliers}
              colorClass="text-blue-600"
              darkColorClass="dark:text-blue-400"
            />
            <SipocSection
              label="Inputs"
              content={data.inputs}
              colorClass="text-green-600"
              darkColorClass="dark:text-green-400"
            />
            <SipocSection
              label="Outputs"
              content={data.outputs}
              colorClass="text-orange-600"
              darkColorClass="dark:text-orange-400"
            />
            <SipocSection
              label="Customers"
              content={data.customers}
              colorClass="text-purple-600"
              darkColorClass="dark:text-purple-400"
            />
          </div>
        )}

        {/* Metrics */}
        {hasMetrics && (
          <div className={cn(
            'flex gap-1.5 flex-wrap',
            hasContent ? 'mt-1 pt-2 border-t border-gray-100 dark:border-gray-700' : 'mt-1'
          )} aria-hidden="true">
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

        {/* Empty state hint */}
        {!hasContent && !hasMetrics && (
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
