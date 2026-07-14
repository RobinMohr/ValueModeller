import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { useGraphStore } from '../../store/graph-store';
import { useValueStreamStore } from '../../store/value-stream-store';
import { useHistoryStore } from '../../store/history-store';

export function StreamEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loadStream = useGraphStore((s) => s.loadStream);
  const unloadStream = useGraphStore((s) => s.unloadStream);
  const getStreamById = useValueStreamStore((s) => s.getStreamById);
  const clearHistory = useHistoryStore((s) => s.clear);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/', { replace: true });
      return;
    }

    const stream = getStreamById(id);
    if (!stream) {
      navigate('/', { replace: true });
      return;
    }

    clearHistory();
    loadStream(id);

    // Allow one render frame for React Flow to process loaded nodes
    const frame = requestAnimationFrame(() => {
      setIsLoading(false);
    });

    return () => {
      cancelAnimationFrame(frame);
      unloadStream();
      clearHistory();
      setIsLoading(true);
    };
  }, [id, loadStream, unloadStream, getStreamById, navigate, clearHistory]);

  if (!id) return null;

  if (isLoading) {
    return <StreamLoadingIndicator />;
  }

  return <AppShell />;
}

function StreamLoadingIndicator() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading value stream…
        </p>
      </div>
    </div>
  );
}
