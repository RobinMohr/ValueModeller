import { useState, useCallback } from 'react';
import { Panel } from '@xyflow/react';
import { cn } from '../../utils/cn';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutEntry[] = [
  { keys: ['Double-click node'], description: 'Open process details' },
  { keys: ['Right-click node'], description: 'Context menu (Edit, Duplicate, Delete)' },
  { keys: ['Enter', 'Space'], description: 'Edit focused node' },
  { keys: ['→', '↓'], description: 'Navigate to downstream node' },
  { keys: ['←', '↑'], description: 'Navigate to upstream node' },
  { keys: ['Tab'], description: 'Next node (Shift+Tab: previous)' },
  { keys: ['Home'], description: 'Focus first node (leftmost)' },
  { keys: ['End'], description: 'Focus last node (rightmost)' },
  { keys: ['Delete', 'Backspace'], description: 'Remove selected node/edge' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'C'], description: 'Copy selected nodes' },
  { keys: ['Ctrl', 'V'], description: 'Paste copied nodes' },
  { keys: ['Ctrl', 'D'], description: 'Duplicate selected nodes' },
  { keys: ['Ctrl', 'F'], description: 'Search processes' },
  { keys: ['Ctrl', 'A'], description: 'Select all nodes' },
  { keys: ['Drag'], description: 'Move node' },
  { keys: ['Drag near node'], description: 'Auto-connect (proximity)' },
  { keys: ['Scroll'], description: 'Zoom in/out' },
  { keys: ['Drag canvas'], description: 'Pan view' },
  { keys: ['Drag handle →'], description: 'Create connection' },
];

export function KeyboardShortcutsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <Panel position="bottom-right" className="relative">
      {isOpen && (
        <div
          className="absolute bottom-12 right-0 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg max-h-[60vh] overflow-y-auto"
          role="dialog"
          aria-label="Keyboard shortcuts"
        >
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Keyboard Shortcuts
          </h3>
          <ul className="space-y-2" role="list">
            {shortcuts.map((shortcut) => (
              <li
                key={shortcut.description}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {shortcut.description}
                </span>
                <span className="flex gap-1 flex-shrink-0">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-2">
            Arrow keys navigate between connected nodes when a node is focused.
          </p>
        </div>
      )}
      <button
        onClick={handleToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          isOpen
            ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
        aria-label={isOpen ? 'Close keyboard shortcuts' : 'Show keyboard shortcuts'}
        aria-expanded={isOpen}
        title="Keyboard shortcuts"
      >
        <span className="text-sm font-semibold">?</span>
      </button>
    </Panel>
  );
}
