import { FlowCanvas } from '../canvas/flow-canvas';
import { SipocForm } from '../form/sipoc-form';
import { useUiStore } from '../../store/ui-store';
import { cn } from '../../utils/cn';

export function AppShell() {
  const isSidePanelOpen = useUiStore((s) => s.isSidePanelOpen);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Value Modeller</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
            Auto-saved
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 relative">
          <FlowCanvas />
        </main>

        {/* Side Panel */}
        <aside
          className={cn(
            'border-l border-gray-200 bg-white transition-all duration-300 overflow-hidden shrink-0',
            isSidePanelOpen ? 'w-[380px]' : 'w-0'
          )}
          aria-label="Process detail panel"
          aria-hidden={!isSidePanelOpen}
        >
          <div className="w-[380px] h-full">
            <SipocForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
