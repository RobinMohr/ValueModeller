import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graph-store';
import { useHistoryStore } from '../store/history-store';

/**
 * Manages clipboard operations (copy/paste/duplicate) and undo/redo keyboard shortcuts.
 * Listens for Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+Z, and Ctrl+Shift+Z/Ctrl+Y.
 * Ignores keystrokes when focus is inside input/textarea elements.
 */
export function useCanvasClipboard(): void {
  const duplicateNodes = useGraphStore((s) => s.duplicateNodes);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const clipboardRef = useRef<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      // Ctrl+Z — undo
      if (isCtrlOrMeta && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if (isCtrlOrMeta && ((event.key === 'z' && event.shiftKey) || event.key === 'y')) {
        event.preventDefault();
        redo();
        return;
      }

      // Ctrl+C — copy selected nodes
      if (isCtrlOrMeta && event.key === 'c') {
        const selectedIds = useGraphStore
          .getState()
          .nodes.filter((n) => n.selected)
          .map((n) => n.id);

        if (selectedIds.length > 0) {
          clipboardRef.current = selectedIds;
        }
      }

      // Ctrl+V — paste copied nodes
      if (isCtrlOrMeta && event.key === 'v') {
        if (clipboardRef.current.length > 0) {
          event.preventDefault();
          duplicateNodes(clipboardRef.current);
        }
      }

      // Ctrl+D — duplicate selected nodes (common shortcut in editors)
      if (isCtrlOrMeta && event.key === 'd') {
        const selectedIds = useGraphStore
          .getState()
          .nodes.filter((n) => n.selected)
          .map((n) => n.id);

        if (selectedIds.length > 0) {
          event.preventDefault();
          duplicateNodes(selectedIds);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [duplicateNodes, undo, redo]);
}
