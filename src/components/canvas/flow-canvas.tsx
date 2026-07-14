import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../../store/graph-store';
import { useUiStore } from '../../store/ui-store';
import { SipocNodeComponent } from './sipoc-node';
import { Button } from '../ui/button';
import type { SipocNode, SipocEdge } from '../../types/sipoc.types';

const nodeTypes = {
  sipoc: SipocNodeComponent,
};

export function FlowCanvas() {
  const reactFlowInstance = useRef<ReactFlowInstance<SipocNode, SipocEdge> | null>(null);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);
  const openSidePanel = useUiStore((s) => s.openSidePanel);

  const handleAddNode = useCallback(() => {
    const viewport = reactFlowInstance.current?.getViewport();
    const x = viewport ? (-viewport.x + 400) / (viewport.zoom || 1) : 250;
    const y = viewport ? (-viewport.y + 300) / (viewport.zoom || 1) : 250;

    const id = addNode({ x, y });
    openSidePanel(id);
  }, [addNode, openSidePanel]);

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        nodeTypes={nodeTypes}
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
        <Panel position="top-left" className="flex gap-2">
          <Button onClick={handleAddNode} size="sm">
            + Add Process
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
