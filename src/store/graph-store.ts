import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { SipocNode, SipocEdge, SipocNodeData } from '../types/sipoc.types';
import { generateId } from '../utils/id';

interface GraphStore {
  nodes: SipocNode[];
  edges: SipocEdge[];
  onNodesChange: OnNodesChange<SipocNode>;
  onEdgesChange: OnEdgesChange<SipocEdge>;
  onConnect: OnConnect;
  addNode: (position: { x: number; y: number }) => string;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<SipocNodeData>) => void;
  getNodeById: (nodeId: string) => SipocNode | undefined;
}

export const useGraphStore = create<GraphStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],

      onNodesChange: (changes: NodeChange<SipocNode>[]) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
      },

      onEdgesChange: (changes: EdgeChange<SipocEdge>[]) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },

      onConnect: (connection: Connection) => {
        set({ edges: addEdge(connection, get().edges) });
      },

      addNode: (position) => {
        const id = generateId();
        const newNode: SipocNode = {
          id,
          type: 'sipoc',
          position,
          data: {
            label: 'New Process',
            processDescription: '',
            suppliers: [],
            inputs: [],
            outputs: [],
            customers: [],
          },
        };
        set({ nodes: [...get().nodes, newNode] });
        return id;
      },

      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        });
      },

      deleteEdge: (edgeId) => {
        set({ edges: get().edges.filter((e) => e.id !== edgeId) });
      },

      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
        });
      },

      getNodeById: (nodeId) => {
        return get().nodes.find((n) => n.id === nodeId);
      },
    }),
    {
      name: 'value-modeller-graph',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
    }
  )
);
