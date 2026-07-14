import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../store/graph-store';
import { useUiStore } from '../store/ui-store';
import type { SipocNode } from '../types/sipoc.types';

/**
 * Hook providing graph-aware keyboard navigation between connected nodes.
 *
 * When a node is focused:
 * - ArrowRight / ArrowDown: navigate to the next downstream (target) node
 * - ArrowLeft / ArrowUp: navigate to the previous upstream (source) node
 * - Enter / Space: open side panel for the focused node
 * - Home: focus the first node (leftmost by position)
 * - End: focus the last node (rightmost by position)
 */
export function useGraphKeyboardNav() {
  const { fitView } = useReactFlow();

  const focusAndSelectNode = useCallback(
    (nodeId: string) => {
      const nodes = useGraphStore.getState().nodes;
      // Select only this node, deselect others
      useGraphStore.setState({
        nodes: nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
      });

      // Fit view to center on the node
      fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 200 });

      // Focus the DOM element after a small delay for React to re-render
      requestAnimationFrame(() => {
        const nodeEl = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement | null;
        if (nodeEl) {
          const focusable = nodeEl.querySelector('[tabindex="0"]') as HTMLElement | null;
          if (focusable) {
            focusable.focus();
          } else {
            nodeEl.focus();
          }
        }
      });
    },
    [fitView]
  );

  const handleNodeKeyDown = useCallback(
    (event: React.KeyboardEvent, nodeId: string) => {
      const { nodes, edges } = useGraphStore.getState();
      const openSidePanel = useUiStore.getState().openSidePanel;

      // Enter or Space: open side panel
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSidePanel(nodeId);
        return;
      }

      // ArrowRight / ArrowDown: navigate to downstream (target) nodes
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const downstreamEdges = edges.filter((e) => e.source === nodeId);
        if (downstreamEdges.length > 0) {
          // Pick the first downstream node (by position if multiple)
          const targets = downstreamEdges
            .map((e) => nodes.find((n) => n.id === e.target))
            .filter((n): n is SipocNode => n !== undefined)
            .sort((a, b) => a.position.y - b.position.y);

          if (targets.length > 0) {
            focusAndSelectNode(targets[0].id);
          }
        }
        return;
      }

      // ArrowLeft / ArrowUp: navigate to upstream (source) nodes
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const upstreamEdges = edges.filter((e) => e.target === nodeId);
        if (upstreamEdges.length > 0) {
          // Pick the first upstream node (by position if multiple)
          const sources = upstreamEdges
            .map((e) => nodes.find((n) => n.id === e.source))
            .filter((n): n is SipocNode => n !== undefined)
            .sort((a, b) => a.position.y - b.position.y);

          if (sources.length > 0) {
            focusAndSelectNode(sources[0].id);
          }
        }
        return;
      }

      // Home: focus the leftmost node (start of value stream)
      if (event.key === 'Home') {
        event.preventDefault();
        const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
        if (sorted.length > 0) {
          focusAndSelectNode(sorted[0].id);
        }
        return;
      }

      // End: focus the rightmost node (end of value stream)
      if (event.key === 'End') {
        event.preventDefault();
        const sorted = [...nodes].sort((a, b) => b.position.x - a.position.x);
        if (sorted.length > 0) {
          focusAndSelectNode(sorted[0].id);
        }
        return;
      }

      // Tab: navigate to the next/previous node in DOM order (position-based)
      if (event.key === 'Tab') {
        event.preventDefault();
        const sortedNodes = [...nodes].sort((a, b) => {
          // Sort left-to-right, then top-to-bottom
          if (Math.abs(a.position.x - b.position.x) > 50) {
            return a.position.x - b.position.x;
          }
          return a.position.y - b.position.y;
        });

        const currentIdx = sortedNodes.findIndex((n) => n.id === nodeId);
        if (currentIdx === -1) return;

        let nextIdx: number;
        if (event.shiftKey) {
          // Shift+Tab: go to previous
          nextIdx = currentIdx > 0 ? currentIdx - 1 : sortedNodes.length - 1;
        } else {
          // Tab: go to next
          nextIdx = currentIdx < sortedNodes.length - 1 ? currentIdx + 1 : 0;
        }

        focusAndSelectNode(sortedNodes[nextIdx].id);
        return;
      }
    },
    [focusAndSelectNode]
  );

  return { handleNodeKeyDown, focusAndSelectNode };
}
