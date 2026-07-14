import { type DragEvent, useCallback } from 'react';

const DRAG_DATA_TYPE = 'application/reactflow-node-type';

interface PaletteItemProps {
  label: string;
  description: string;
  nodeType: string;
  icon: React.ReactNode;
}

function PaletteItem({ label, description, nodeType, icon }: PaletteItemProps) {
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData(DRAG_DATA_TYPE, nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    [nodeType]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white shadow-sm cursor-grab active:cursor-grabbing hover:border-primary-300 hover:shadow-md transition-all select-none"
      role="button"
      aria-label={`Drag to add ${label}`}
    >
      <div className="flex-shrink-0 w-7 h-7 rounded bg-primary-50 text-primary-600 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 leading-tight">{label}</p>
        <p className="text-[10px] text-gray-400 leading-tight truncate">{description}</p>
      </div>
    </div>
  );
}

export function NodePalette() {
  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 shadow-lg min-w-[160px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
        Drag to canvas
      </p>
      <PaletteItem
        label="Process"
        description="SIPOC process step"
        nodeType="sipoc"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        }
      />
      <PaletteItem
        label="Group"
        description="Swimlane / team group"
        nodeType="group"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />
    </div>
  );
}

export { DRAG_DATA_TYPE };
