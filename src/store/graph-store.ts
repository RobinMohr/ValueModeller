import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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
import { useValueStreamStore } from './value-stream-store';

interface GraphStore {
  activeStreamId: string | null;
  nodes: SipocNode[];
  edges: SipocEdge[];
  onNodesChange: OnNodesChange<SipocNode>;
  onEdgesChange: OnEdgesChange<SipocEdge>;
  onConnect: OnConnect;
  addNode: (position: { x: number; y: number }) => string;
  addGroupNode: (position: { x: number; y: number }) => string;
  duplicateNodes: (nodeIds: string[], offset?: { x: number; y: number }) => string[];
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<SipocNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Record<string, unknown>) => void;
  getNodeById: (nodeId: string) => SipocNode | undefined;
  assignNodeToGroup: (nodeId: string, groupId: string | null) => void;
  loadStream: (streamId: string) => void;
  unloadStream: () => void;
}

export const useGraphStore = create<GraphStore>()(
  subscribeWithSelector((set, get) => ({
    activeStreamId: null,
    nodes: [],
    edges: [],

    onNodesChange: (changes: NodeChange<SipocNode>[]) => {
      set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes: EdgeChange<SipocEdge>[]) => {
      set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    onConnect: (connection: Connection) => {
      const nodes = get().nodes;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // Auto-fill target's inputs/suppliers from source's outputs/customers
      if (sourceNode && targetNode) {
        const updates: Partial<SipocNodeData> = {};

        if (!targetNode.data.inputs && sourceNode.data.outputs) {
          updates.inputs = sourceNode.data.outputs;
        }
        if (!targetNode.data.suppliers && sourceNode.data.customers) {
          updates.suppliers = sourceNode.data.customers;
        }

        if (Object.keys(updates).length > 0) {
          const updatedNodes = nodes.map((node) =>
            node.id === connection.target
              ? { ...node, data: { ...node.data, ...updates } }
              : node
          );
          set({ nodes: updatedNodes, edges: addEdge(connection, get().edges) });
          return;
        }
      }

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
          cycleTime: '',
          leadTime: '',
          valueAddPercent: '',
        },
      };
      set({ nodes: [...get().nodes, newNode] });
      return id;
    },

    addGroupNode: (position) => {
      const id = generateId();
      const GROUP_COLORS = ['blue', 'green', 'purple', 'amber', 'rose', 'teal'];
      const existingGroupCount = get().nodes.filter((n) => n.type === 'group').length;
      const color = GROUP_COLORS[existingGroupCount % GROUP_COLORS.length];

      const newNode: SipocNode = {
        id,
        type: 'group',
        position,
        data: {
          label: 'New Group',
          color,
          processDescription: '',
          suppliers: '',
          inputs: '',
          outputs: '',
          customers: '',
          applicationsInvolved: '',
          involvedTeams: '',
          knownIssues: '',
          cycleTime: '',
          leadTime: '',
          valueAddPercent: '',
        },
        style: { width: 400, height: 250 },
      };
      set({ nodes: [newNode, ...get().nodes] });
      return id;
    },

    duplicateNodes: (nodeIds, offset = { x: 50, y: 50 }) => {
      const currentNodes = get().nodes;
      const currentEdges = get().edges;
      const oldToNewIdMap = new Map<string, string>();
      const newNodes: SipocNode[] = [];

      // Create cloned nodes with new IDs and offset positions
      for (const nodeId of nodeIds) {
        const original = currentNodes.find((n) => n.id === nodeId);
        if (!original) continue;

        const newId = generateId();
        oldToNewIdMap.set(nodeId, newId);

        const clonedData = { ...original.data, label: `${original.data.label} (copy)` };

        newNodes.push({
          ...original,
          id: newId,
          position: {
            x: original.position.x + offset.x,
            y: original.position.y + offset.y,
          },
          selected: true,
          data: clonedData,
        } as SipocNode);
      }

      // Clone edges that connect duplicated nodes to each other
      const newEdges = currentEdges
        .filter(
          (e) => oldToNewIdMap.has(e.source) && oldToNewIdMap.has(e.target)
        )
        .map((e) => ({
          ...e,
          id: generateId(),
          source: oldToNewIdMap.get(e.source)!,
          target: oldToNewIdMap.get(e.target)!,
        }));

      // Deselect existing nodes, add new ones as selected
      const deselectedNodes = currentNodes.map((n) => ({ ...n, selected: false }));

      set({
        nodes: [...deselectedNodes, ...newNodes],
        edges: [...currentEdges, ...newEdges],
      });

      return newNodes.map((n) => n.id);
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

    updateEdgeData: (edgeId, data) => {
      set({
        edges: get().edges.map((edge) =>
          edge.id === edgeId
            ? { ...edge, data: { ...(edge.data ?? {}), ...data } }
            : edge
        ),
      });
    },

    getNodeById: (nodeId) => {
      return get().nodes.find((n) => n.id === nodeId);
    },

    assignNodeToGroup: (nodeId, groupId) => {
      set({
        nodes: get().nodes.map((node) => {
          if (node.id !== nodeId) return node;
          if (groupId === null) {
            // Remove from group — clear parentId and extent
            const updated = { ...node } as Record<string, unknown>;
            delete updated.parentId;
            delete updated.extent;
            return updated as SipocNode;
          }
          // Assign to group — make position relative to parent
          const groupNode = get().nodes.find((n) => n.id === groupId);
          if (!groupNode) return node;
          return {
            ...node,
            parentId: groupId,
            extent: 'parent' as const,
            position: {
              x: node.position.x - groupNode.position.x,
              y: node.position.y - groupNode.position.y,
            },
          } as SipocNode;
        }),
      });
    },

    loadStream: (streamId) => {
      const stream = useValueStreamStore.getState().getStreamById(streamId);
      if (stream) {
        set({
          activeStreamId: streamId,
          nodes: stream.nodes,
          edges: stream.edges,
        });
      }
    },

    unloadStream: () => {
      // Save current state back to the value stream store before unloading
      const { activeStreamId, nodes, edges } = get();
      if (activeStreamId) {
        useValueStreamStore.getState().saveStreamGraph(activeStreamId, nodes, edges);
      }
      set({ activeStreamId: null, nodes: [], edges: [] });
    },
  }))
);

// Auto-save: whenever nodes or edges change, persist back to value stream store
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useGraphStore.subscribe(
  (state) => ({ nodes: state.nodes, edges: state.edges, activeStreamId: state.activeStreamId }),
  ({ nodes, edges, activeStreamId }) => {
    if (!activeStreamId) return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      useValueStreamStore.getState().saveStreamGraph(activeStreamId, nodes, edges);
    }, 500);
  },
  { equalityFn: (a, b) => a.nodes === b.nodes && a.edges === b.edges && a.activeStreamId === b.activeStreamId }
);
