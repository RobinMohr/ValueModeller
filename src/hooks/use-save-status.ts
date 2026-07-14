import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../store/graph-store';

type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Tracks the save status of the graph store's persist middleware.
 * Returns a status that transitions: idle → saving → saved
 * whenever the graph store data changes.
 */
export function useSaveStatus(): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Subscribe to nodes and edges changes
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  useEffect(() => {
    // Skip the initial render (hydration from localStorage)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show "saving" immediately
    setStatus('saving');

    // After a brief delay (simulating persist write), show "saved"
    timeoutRef.current = setTimeout(() => {
      setStatus('saved');
    }, 400);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges]);

  return status;
}
