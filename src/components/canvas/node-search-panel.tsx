import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../../store/graph-store';
import { cn } from '../../utils/cn';
import type { SipocNode } from '../../types/sipoc.types';

interface NodeSearchResult {
  node: SipocNode;
  matchField: string;
  matchSnippet: string;
}

function searchNodes(nodes: SipocNode[], query: string): NodeSearchResult[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: NodeSearchResult[] = [];

  for (const node of nodes) {
    const { data } = node;

    // Search in label (process name)
    if (data.label.toLowerCase().includes(lowerQuery)) {
      results.push({ node, matchField: 'Name', matchSnippet: data.label });
      continue;
    }

    // Search in description
    if (data.processDescription.toLowerCase().includes(lowerQuery)) {
      results.push({ node, matchField: 'Description', matchSnippet: getSnippet(data.processDescription, lowerQuery) });
      continue;
    }

    // Search in SIPOC fields
    const sipocFields: Array<{ key: keyof typeof data; label: string }> = [
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'inputs', label: 'Inputs' },
      { key: 'outputs', label: 'Outputs' },
      { key: 'customers', label: 'Customers' },
      { key: 'applicationsInvolved', label: 'Applications' },
      { key: 'involvedTeams', label: 'Teams' },
      { key: 'knownIssues', label: 'Issues' },
    ];

    let found = false;
    for (const field of sipocFields) {
      const value = String(data[field.key] ?? '');
      if (value.toLowerCase().includes(lowerQuery)) {
        results.push({ node, matchField: field.label, matchSnippet: getSnippet(value, lowerQuery) });
        found = true;
        break;
      }
    }
    if (found) continue;
  }

  return results;
}

function getSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text.slice(0, 40);

  const start = Math.max(0, idx - 15);
  const end = Math.min(text.length, idx + query.length + 25);
  let snippet = text.slice(start, end).replace(/\n/g, ' ');

  if (start > 0) snippet = '…' + snippet;
  if (end < text.length) snippet = snippet + '…';

  return snippet;
}

export function NodeSearchPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NodeSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fitView } = useReactFlow();

  // Compute search results and highlight matching nodes when query changes.
  // Intentionally excludes `nodes` from deps to avoid an infinite loop:
  // setState({ nodes }) would trigger a re-render with a new nodes reference,
  // which would re-trigger this effect endlessly.
  useEffect(() => {
    const currentNodes = useGraphStore.getState().nodes;
    const searchResults = searchNodes(currentNodes, query);
    setResults(searchResults);
    setSelectedIndex(0);

    if (query.trim()) {
      const matchingIds = searchResults.map((r) => r.node.id);
      const updatedNodes = currentNodes.map((n) => ({
        ...n,
        selected: matchingIds.includes(n.id),
      }));
      useGraphStore.setState({ nodes: updatedNodes });
    } else {
      // Clear selection when query is empty
      const updatedNodes = currentNodes.map((n) => ({
        ...n,
        selected: false,
      }));
      useGraphStore.setState({ nodes: updatedNodes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Keyboard shortcut: Ctrl+F to open search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to close search from the search input itself
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
          setQuery('');
          return;
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }

      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 300 });
      // Select only the focused node
      const currentNodes = useGraphStore.getState().nodes;
      useGraphStore.setState({
        nodes: currentNodes.map((n) => ({ ...n, selected: n.id === nodeId })),
      });
    },
    [fitView]
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter' && results[selectedIndex]) {
        event.preventDefault();
        handleFocusNode(results[selectedIndex].node.id);
      } else if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    },
    [results, selectedIndex, handleFocusNode]
  );

  const handleToggle = useCallback(() => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        aria-label="Search nodes (Ctrl+F)"
        title="Search nodes (Ctrl+F)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline ml-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded px-1">⌘F</kbd>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="w-72 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search steps…"
          className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none bg-transparent"
          aria-label="Search steps by name, description, or SIPOC fields"
        />
        <button
          onClick={handleToggle}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5"
          aria-label="Close search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results list */}
      {query.trim() && (
        <div className="max-h-60 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              No steps found
            </div>
          ) : (
            <ul className="py-1" role="listbox" aria-label="Search results">
              {results.map((result, idx) => (
                <li
                  key={result.node.id}
                  role="option"
                  aria-selected={idx === selectedIndex}
                  onClick={() => handleFocusNode(result.node.id)}
                  className={cn(
                    'px-3 py-2 cursor-pointer transition-colors',
                    idx === selectedIndex
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {result.node.data.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {result.matchField}
                    </span>
                  </div>
                  {result.matchField !== 'Name' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {result.matchSnippet}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
            {results.length} result{results.length !== 1 ? 's' : ''} • ↑↓ navigate • Enter to focus • Esc to close
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
