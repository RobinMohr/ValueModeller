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
            suppliers: '',
            inputs: '',
            outputs: '',
            customers: '',
            applicationsInvolved: '',
            involvedTeams: '',
            knownIssues: '',
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
      version: 1,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { nodes?: SipocNode[]; edges?: SipocEdge[] };

        if (version === 0 && state.nodes) {
          // Migrate from v0 (array-based SIPOC fields) to v1 (string-based)
          state.nodes = state.nodes.map((node) => {
            const data = node.data as Record<string, unknown>;
            const migrateField = (field: unknown): string => {
              if (typeof field === 'string') return field;
              if (Array.isArray(field)) {
                return field
                  .map((entry: { value?: string }) => entry.value ?? '')
                  .filter((v: string) => v.trim() !== '')
                  .join('\n');
              }
              return '';
            };

            return {
              ...node,
              data: {
                ...node.data,
                suppliers: migrateField(data.suppliers),
                inputs: migrateField(data.inputs),
                outputs: migrateField(data.outputs),
                customers: migrateField(data.customers),
                applicationsInvolved: (data.applicationsInvolved as string) ?? '',
                involvedTeams: (data.involvedTeams as string) ?? '',
                knownIssues: (data.knownIssues as string) ?? '',
              },
            };
          });
        }

        return state as { nodes: SipocNode[]; edges: SipocEdge[] };
      },
    }
  )
);
