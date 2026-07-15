import { useCallback, useMemo, useState, type DragEvent } from 'react';
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
import { useThemeStore } from '../../store/theme-store';
import { useProximityConnect } from '../../hooks/use-proximity-connect';
import { useCanvasContextMenu } from '../../hooks/use-canvas-context-menu';
import { useCanvasClipboard } from '../../hooks/use-canvas-clipboard';
import { useHelperLines } from '../../hooks/use-helper-lines';
import { useGroupDragDetection } from '../../hooks/use-group-drag-detection';
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
        + Add Step
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

function FlowCanvasInner() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);
  const getNodeById = useGraphStore((s) => s.getNodeById);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const effectiveTheme = useThemeStore((s) => s.getEffectiveTheme());
  const { screenToFlowPosition } = useReactFlow();

  // --- Extracted hooks ---
  const { contextMenu, handleNodeContextMenu, closeContextMenu, getContextMenuItems } =
    useCanvasContextMenu();
  useCanvasClipboard();
  const { helperLines, handleNodesChange, clearHelperLines } = useHelperLines();
  const { handleGroupDetection } = useGroupDragDetection();

  // Proximity connect: auto-create edges when dragging nodes near each other
  const handleProximityEdge = useCallback(
    (info: { sourceId: string; targetId: string; label: string }) => {
      const storeOnConnect = useGraphStore.getState().onConnect;
      storeOnConnect({
        source: info.sourceId,
        target: info.targetId,
        sourceHandle: null,
        targetHandle: null,
      });
    },
    []
  );

  const { ghostEdge, onNodeDrag, onNodeDragStop: proximityDragStop } = useProximityConnect(
    nodes,
    edges,
    getNodeById,
    handleProximityEdge
  );

  // Compose onNodeDragStop: clear helper lines + proximity connect + group detection
  const handleNodeDragStop: OnNodeDrag<SipocNode> = useCallback(
    (event, node, draggedNodes) => {
      clearHelperLines();
      proximityDragStop(event, node, draggedNodes);
      handleGroupDetection(event, node, draggedNodes);
    },
    [clearHelperLines, proximityDragStop, handleGroupDetection]
  );

  // Merge ghost edge with real edges for display
  const displayEdges = useMemo(
    () => (ghostEdge ? [...edges, ghostEdge] : edges),
    [edges, ghostEdge]
  );

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
      onConnect(connection);
    },
    [onConnect]
  );

  // Close context menu on pane click
  const handlePaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: SipocNode) => {
      openSidePanel(node.id);
    },
    [openSidePanel]
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
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'smart', animated: true }}
        colorMode={effectiveTheme}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-gray-50"
        aria-label="Value stream canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        />
        <ToolbarPanel />
        <Panel position="bottom-left">
          <NodePalette />
        </Panel>
        <Panel position="top-right" className="mt-2 mr-2 flex items-center gap-2">
          <NodeSearchPanel />
          <GuidedDemoPanel />
        </Panel>
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
