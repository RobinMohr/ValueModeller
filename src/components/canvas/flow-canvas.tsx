import { useCallback, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../../store/graph-store';
import { useUiStore } from '../../store/ui-store';
import { SipocNodeComponent } from './sipoc-node';
import { Button } from '../ui/button';
import { demoNodes, demoEdges } from '../../utils/demo-data';
import type { SipocNode } from '../../types/sipoc.types';

const nodeTypes = {
  sipoc: SipocNodeComponent,
};

function ToolbarPanel() {
  const { fitView, getViewport } = useReactFlow();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const addNode = useGraphStore((s) => s.addNode);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);

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

  const handleReset = useCallback(() => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
      return;
    }
    closeSidePanel();
    useGraphStore.setState({ nodes: demoNodes, edges: demoEdges });
    setShowResetConfirm(false);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [showResetConfirm, closeSidePanel, fitView]);

  return (
    <Panel position="top-left" className="flex gap-2">
      <Button onClick={handleAddNode} size="sm">
        + Add Process
      </Button>
      <Button onClick={handleFitView} size="sm" variant="secondary">
        Fit View
      </Button>
      <Button
        onClick={handleReset}
        size="sm"
        variant={showResetConfirm ? 'danger' : 'secondary'}
      >
        {showResetConfirm ? 'Confirm Reset?' : 'Reset Demo'}
      </Button>
    </Panel>
  );
}

function FlowCanvasInner() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const openSidePanel = useUiStore((s) => s.openSidePanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);

  const handleNodesChange = useCallback(
    (changes: import('@xyflow/react').NodeChange<SipocNode>[]) => {
      const removedIds = changes
        .filter((c): c is import('@xyflow/react').NodeRemoveChange => c.type === 'remove')
        .map((c) => c.id);

      if (removedIds.length > 0 && selectedNodeId && removedIds.includes(selectedNodeId)) {
        closeSidePanel();
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

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
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
      </ReactFlow>
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
