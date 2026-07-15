import { useCallback, useState } from 'react';
import { useGraphStore } from '../store/graph-store';
import { useUiStore } from '../store/ui-store';
import type { SipocNode } from '../types/sipoc.types';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

export interface ContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  variant?: 'default' | 'danger';
}

interface UseCanvasContextMenuReturn {
  contextMenu: ContextMenuState | null;
  handleNodeContextMenu: (event: React.MouseEvent, node: SipocNode) => void;
  closeContextMenu: () => void;
  getContextMenuItems: (nodeId: string) => ContextMenuItem[];
}

/**
 * Manages context menu state and actions for the canvas.
 * Handles right-click on nodes, providing edit/duplicate/select-all/delete actions.
 */
export function useCanvasContextMenu(): UseCanvasContextMenuReturn {
  const nodes = useGraphStore((s) => s.nodes);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const duplicateNodes = useGraphStore((s) => s.duplicateNodes);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: SipocNode) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const getContextMenuItems = useCallback(
    (nodeId: string): ContextMenuItem[] => {
      return [
        {
          label: 'Edit Details',
          icon: '✏️',
          action: () => openSidePanel(nodeId),
        },
        {
          label: 'Duplicate',
          icon: '📋',
          action: () => duplicateNodes([nodeId]),
        },
        {
          label: `Select All (${nodes.length})`,
          icon: '☑️',
          action: () => {
            useGraphStore.setState({
              nodes: nodes.map((n) => ({ ...n, selected: true })),
            });
          },
        },
        {
          label: 'Delete',
          icon: '🗑️',
          action: () => {
            if (selectedNodeId === nodeId) {
              closeSidePanel();
            }
            deleteNode(nodeId);
          },
          variant: 'danger' as const,
        },
      ];
    },
    [nodes, openSidePanel, duplicateNodes, deleteNode, selectedNodeId, closeSidePanel]
  );

  return {
    contextMenu,
    handleNodeContextMenu,
    closeContextMenu,
    getContextMenuItems,
  };
}
