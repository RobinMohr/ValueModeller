import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowCanvas } from '../canvas/flow-canvas';
import { SipocForm } from '../form/sipoc-form';
import { StreamMetadataForm } from './stream-metadata-form';
import { StreamStatsPanel } from './stream-stats-panel';
import { useUiStore } from '../../store/ui-store';
import { useGraphStore } from '../../store/graph-store';
import { useValueStreamStore } from '../../store/value-stream-store';
import { useSaveStatus } from '../../hooks/use-save-status';
import { exportModelToJson, importModelFromJson } from '../../utils/export-import';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/theme-toggle';
import { cn } from '../../utils/cn';

function SaveIndicator() {
  const status = useSaveStatus();

  if (status === 'idle') {
    return null;
  }

  if (status === 'saving') {
    return (
      <span className="px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium animate-pulse">
        Saving…
      </span>
    );
  }

  return (
    <span className="px-2 py-1 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
      Saved ✓
    </span>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const isSidePanelOpen = useUiStore((s) => s.isSidePanelOpen);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const activeStreamId = useGraphStore((s) => s.activeStreamId);
  const stream = useValueStreamStore((s) =>
    s.streams.find((st) => st.id === activeStreamId)
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [showStreamMeta, setShowStreamMeta] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleExport = useCallback(() => {
    const { nodes, edges } = useGraphStore.getState();
    exportModelToJson(nodes, edges);
  }, []);

  const handleImport = useCallback(async () => {
    setImportError(null);
    const model = await importModelFromJson();
    if (model === null) {
      setImportError('Invalid file. Please select a valid Value Modeller JSON export.');
      setTimeout(() => setImportError(null), 4000);
      return;
    }
    closeSidePanel();
    useGraphStore.setState({ nodes: model.nodes, edges: model.edges });
  }, [closeSidePanel]);

  const handleBackToStreams = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Skip navigation link for screen reader / keyboard users */}
      <a
        href="#canvas-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to canvas
      </a>

      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToStreams}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            aria-label="Back to value streams"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {stream?.name ?? 'Value Modeller'}
            </h1>
            {stream?.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[300px]">{stream.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Button onClick={() => setShowStreamMeta(true)} size="sm" variant="ghost" aria-label="Edit stream details">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Stream Details
          </Button>
          <Button
            onClick={() => setShowStats((prev) => !prev)}
            size="sm"
            variant="ghost"
            aria-label="Toggle stream statistics"
            aria-expanded={showStats}
            className={cn(showStats && 'bg-primary-50 text-primary-700')}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stats
          </Button>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
          <Button onClick={handleImport} size="sm" variant="ghost" aria-label="Import model from JSON file">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Button>
          <Button onClick={handleExport} size="sm" variant="ghost" aria-label="Export model as JSON file">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 0l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
          <ThemeToggle />
          <SaveIndicator />
          {importError && (
            <span className="px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
              {importError}
            </span>
          )}
        </div>
      </header>

      {/* Stream Statistics Panel (collapsible) */}
      {showStats && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
          <StreamStatsPanel />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main id="canvas-main" className="flex-1 relative" role="application" aria-label="Value stream canvas editor. Use Tab to navigate between nodes, arrow keys to follow connections.">
          <FlowCanvas />
        </main>

        {/* Side Panel - SIPOC Form */}
        <aside
          className={cn(
            'border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 overflow-hidden shrink-0',
            isSidePanelOpen ? 'w-[380px]' : 'w-0'
          )}
          aria-label="Step detail panel"
          aria-hidden={!isSidePanelOpen}
        >
          <div className="w-[380px] h-full">
            <SipocForm />
          </div>
        </aside>
      </div>

      {/* Stream Metadata Modal */}
      {showStreamMeta && activeStreamId && (
        <StreamMetadataForm
          streamId={activeStreamId}
          onClose={() => setShowStreamMeta(false)}
        />
      )}
    </div>
  );
}
