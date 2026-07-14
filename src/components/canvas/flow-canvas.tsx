import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
  type Connection,
  type IsValidConnection,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../../store/graph-store';
import { useUiStore } from '../../store/ui-store';
import { useHistoryStore } from '../../store/history-store';
import { useProximityConnect } from '../../hooks/use-proximity-connect';
import { SipocNodeComponent } from './sipoc-node';
import { LabeledEdge } from './labeled-edge';
import { SmartEdge } from './smart-edge';
import { KeyboardShortcutsPanel } from './keyboard-shortcuts-panel';
import { NodeSearchPanel } from './node-search-panel';
import { NodeContextMenu } from './node-context-menu';
import { NodePalette, DRAG_DATA_TYPE } from './node-palette';
import { GuidedDemoPanel } from './guided-demo-panel';
import { HelperLinesRenderer } from './helper-lines';
import { GroupNodeComponent } from './group-node';
import { Button } from '../ui/button';
import { getLayoutedNodes } from '../../utils/auto-layout';
import { getHelperLines } from '../../utils/helper-lines';
import { wouldCreateCycle } from '../../utils/cycle-detection';
import type { SipocNode } from '../../types/sipoc.types';

const nodeTypes = {
  sipoc: SipocNodeComponent,
  group: GroupNodeComponent,
};

const edgeTypes = {
  labeled: LabeledEdge,
  smart: SmartEdge,
};

function ToolbarPanel() {
  const { fitView, getViewport } = useReactFlow();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const addNode = useGraphStore((s) => s.addNode);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const handleAddNode = useCallback(() => {
    const viewport = getViewport();
    const x = (-viewport.x + 400) / (viewport.zoom || 1);
    const y = (-viewport.y + 300) / (viewport.zoom || 1);

    const id = addNode({ x, y });
    openSidePanel(id);
  }, [addNode, openSidePanel, getViewport]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  const handleAutoLayout = useCallback(() => {
    const { nodes, edges } = useGraphStore.getState();
    const layoutedNodes = getLayoutedNodes(nodes, edges, { direction: 'LR' });
    useGraphStore.setState({ nodes: layoutedNodes });
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [fitView]);

  const handleReset = useCallback(() => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
      return;
    }
    closeSidePanel();
    useGraphStore.setState({ nodes: [], edges: [] });
    setShowResetConfirm(false);
  }, [showResetConfirm, closeSidePanel]);

  return (
    <Panel position="top-left" className="flex gap-2">
      <Button onClick={handleAddNode} size="sm">
        + Add Process
      </Button>
      <Button
        onClick={undo}
        size="sm"
        variant="secondary"
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        ↩ Undo
      </Button>
      <Button
        onClick={redo}
        size="sm"
        variant="secondary"
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        ↪ Redo
      </Button>
      <Button onClick={handleAutoLayout} size="sm" variant="secondary">
        Auto Layout
      </Button>
      <Button onClick={handleFitView} size="sm" variant="secondary">
        Fit View
      </Button>
      <Button
        onClick={handleReset}
        size="sm"
        variant={showResetConfirm ? 'danger' : 'secondary'}
      >
        {showResetConfirm ? 'Confirm Clear?' : 'Clear Canvas'}
      </Button>
    </Panel>
  );
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

function FlowCanvasInner() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const addNode = useGraphStore((s) => s.addNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const duplicateNodes = useGraphStore((s) => s.duplicateNodes);
  const getNodeById = useGraphStore((s) => s.getNodeById);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const { screenToFlowPosition } = useReactFlow();

  // Helper lines state (for snap-to-grid alignment)
  const [helperLines, setHelperLines] = useState<{ horizontal: number | null; vertical: number | null }>({
    horizontal: null,
    vertical: null,
  });

  // Context menu state
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
    (nodeId: string) => {
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

  // Close context menu on pane click or scroll
  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Proximity connect: auto-create edges when dragging nodes near each other
  const handleProximityEdge = useCallback(
    (info: { sourceId: string; targetId: string; label: string }) => {
      const { edges: currentEdges } = useGraphStore.getState();
      const newEdge = {
        id: `e${info.sourceId}-${info.targetId}`,
        source: info.sourceId,
        target: info.targetId,
        type: 'smart' as const,
        animated: true,
        data: { label: info.label },
      };
      useGraphStore.setState({ edges: [...currentEdges, newEdge] });
    },
    []
  );

  const { ghostEdge, onNodeDrag, onNodeDragStop: proximityDragStop } = useProximityConnect(
    nodes,
    edges,
    getNodeById,
    handleProximityEdge
  );

  // Wrap onNodeDragStop to also clear helper lines and detect group membership
  const handleNodeDragStop: OnNodeDrag<SipocNode> = useCallback(
    (event, node, draggedNodes) => {
      setHelperLines({ horizontal: null, vertical: null });
      proximityDragStop(event, node, draggedNodes);

      // Skip group assignment for group nodes themselves
      if (node.type === 'group') return;

      // Check if the dragged node was dropped inside a group node
      const allNodes = useGraphStore.getState().nodes;
      const assignNodeToGroup = useGraphStore.getState().assignNodeToGroup;

      // Get absolute position of the dragged node
      const nodeAbsX = node.position.x;
      const nodeAbsY = node.position.y;

      // Find group nodes that contain this position
      const groupNode = allNodes.find((n) => {
        if (n.type !== 'group') return false;
        if (n.id === node.id) return false;
        // Already has this parent — skip reassignment
        if ((node as Record<string, unknown>).parentId === n.id) return false;

        const gx = n.position.x;
        const gy = n.position.y;
        const gw = (n.style?.width as number) ?? (n.measured?.width ?? 400);
        const gh = (n.style?.height as number) ?? (n.measured?.height ?? 250);

        return nodeAbsX >= gx && nodeAbsX <= gx + gw && nodeAbsY >= gy && nodeAbsY <= gy + gh;
      });

      const currentParent = (node as Record<string, unknown>).parentId as string | undefined;

      if (groupNode && currentParent !== groupNode.id) {
        // Assign to group
        assignNodeToGroup(node.id, groupNode.id);
      } else if (!groupNode && currentParent) {
        // Removed from group — convert to absolute position
        const parentNode = allNodes.find((n) => n.id === currentParent);
        if (parentNode) {
          // First update position to absolute, then remove parent
          const absPosition = {
            x: node.position.x + parentNode.position.x,
            y: node.position.y + parentNode.position.y,
          };
          useGraphStore.setState({
            nodes: allNodes.map((n) => {
              if (n.id !== node.id) return n;
              const { parentId, extent, ...rest } = n as Record<string, unknown>;
              return { ...rest, position: absPosition } as SipocNode;
            }),
          });
        }
      }
    },
    [proximityDragStop]
  );

  // Merge ghost edge with real edges for display
  const displayEdges = useMemo(
    () => (ghostEdge ? [...edges, ghostEdge] : edges),
    [edges, ghostEdge]
  );

  // Clipboard for copy/paste
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

  // Connection validation: prevent cycles (value streams must be DAGs)
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) return false;

      // Prevent duplicate edges
      const { edges: currentEdges } = useGraphStore.getState();
      const isDuplicate = currentEdges.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (isDuplicate) return false;

      // Prevent cycles — check if adding this edge would form a cycle
      return !wouldCreateCycle(currentEdges, connection.source, connection.target);
    },
    []
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      // Derive edge label from source node's outputs (first line)
      const sourceNode = getNodeById(connection.source);
      const outputsText = sourceNode?.data?.outputs ?? '';
      const firstOutput = outputsText.split('\n').filter((s) => s.trim())[0] ?? '';

      // Add edge with label and smart type
      const { edges: currentEdges } = useGraphStore.getState();
      const newEdge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        type: 'smart' as const,
        animated: true,
        data: { label: firstOutput },
      };
      useGraphStore.setState({
        edges: [...currentEdges, newEdge],
      });
    },
    [getNodeById]
  );

  const handleNodesChange = useCallback(
    (changes: import('@xyflow/react').NodeChange<SipocNode>[]) => {
      const removedIds = changes
        .filter((c): c is import('@xyflow/react').NodeRemoveChange => c.type === 'remove')
        .map((c) => c.id);

      if (removedIds.length > 0 && selectedNodeId && removedIds.includes(selectedNodeId)) {
        closeSidePanel();
      }

      // Helper lines: detect position changes (dragging) and snap to alignment
      const positionChanges = changes.filter(
        (c): c is import('@xyflow/react').NodePositionChange =>
          c.type === 'position' && c.dragging === true && c.position !== undefined
      );

      if (positionChanges.length === 1) {
        const change = positionChanges[0];
        const currentNodes = useGraphStore.getState().nodes;
        const draggingNode = currentNodes.find((n) => n.id === change.id);

        if (draggingNode && change.position) {
          // Create a temporary node at the new position for helper line calculation
          const tempNode = { ...draggingNode, position: change.position };
          const lines = getHelperLines(tempNode, currentNodes);

          setHelperLines({
            horizontal: lines.horizontal,
            vertical: lines.vertical,
          });

          // Apply snap if within threshold
          if (lines.snapX !== null || lines.snapY !== null) {
            change.position = {
              x: lines.snapX ?? change.position.x,
              y: lines.snapY ?? change.position.y,
            };
          }
        }
      } else if (positionChanges.length === 0) {
        // Not dragging — check if drag ended
        const hasNonDragging = changes.some(
          (c) => c.type === 'position' && c.dragging === false
        );
        if (hasNonDragging) {
          setHelperLines({ horizontal: null, vertical: null });
        }
      }

      onNodesChange(changes);
    },
    [onNodesChange, selectedNodeId, closeSidePanel]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: SipocNode) => {
      openSidePanel(node.id);
    },
    [openSidePanel]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(DRAG_DATA_TYPE);
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (nodeType === 'group') {
        const addGroupNode = useGraphStore.getState().addGroupNode;
        addGroupNode(position);
        return;
      }

      const id = addNode(position);
      openSidePanel(id);
    },
    [screenToFlowPosition, addNode, openSidePanel]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'smart', animated: true }}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-gray-50"
        aria-label="Value stream canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          className="!bg-white !border-gray-200"
        />
        <ToolbarPanel />
        <Panel position="bottom-left">
          <NodePalette />
        </Panel>
        <NodeSearchPanel />
        <GuidedDemoPanel />
        <KeyboardShortcutsPanel />
        <HelperLinesRenderer
          horizontal={helperLines.horizontal}
          vertical={helperLines.vertical}
        />
      </ReactFlow>
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          items={getContextMenuItems(contextMenu.nodeId)}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
