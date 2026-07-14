import { create } from 'zustand';
import type { SipocNode, SipocEdge } from '../types/sipoc.types';
import { useGraphStore } from './graph-store';

interface HistorySnapshot {
  nodes: SipocNode[];
  edges: SipocEdge[];
}

interface HistoryStore {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  isUndoRedoAction: boolean;
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (snapshot: HistorySnapshot) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  isUndoRedoAction: false,
  canUndo: false,
  canRedo: false,

  pushSnapshot: (snapshot) => {
    const { past } = get();
    const newPast = [...past, snapshot].slice(-MAX_HISTORY);
    set({
      past: newPast,
      future: [],
      canUndo: newPast.length > 0,
      canRedo: false,
    });
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    // Save current state to future
    const { nodes, edges } = useGraphStore.getState();
    const currentSnapshot: HistorySnapshot = { nodes, edges };

    set({
      past: newPast,
      future: [currentSnapshot, ...get().future],
      isUndoRedoAction: true,
      canUndo: newPast.length > 0,
      canRedo: true,
    });

    // Apply previous state to graph store
    useGraphStore.setState({ nodes: previous.nodes, edges: previous.edges });

    // Reset flag after state application
    set({ isUndoRedoAction: false });
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    // Save current state to past
    const { nodes, edges } = useGraphStore.getState();
    const currentSnapshot: HistorySnapshot = { nodes, edges };

    set({
      past: [...get().past, currentSnapshot],
      future: newFuture,
      isUndoRedoAction: true,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });

    // Apply next state to graph store
    useGraphStore.setState({ nodes: next.nodes, edges: next.edges });

    // Reset flag after state application
    set({ isUndoRedoAction: false });
  },

  clear: () => {
    set({ past: [], future: [], canUndo: false, canRedo: false });
  },
}));

// Debounce timer for batching rapid changes (e.g., node dragging)
let historyTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: HistorySnapshot | null = null;

/**
 * Subscribe to graph store changes and push history snapshots.
 * We capture the state BEFORE the change as the "undo target".
 * Debounced to batch rapid changes like dragging.
 */
let lastNodes: SipocNode[] = useGraphStore.getState().nodes;
let lastEdges: SipocEdge[] = useGraphStore.getState().edges;

useGraphStore.subscribe(
  (state) => ({ nodes: state.nodes, edges: state.edges }),
  ({ nodes, edges }) => {
    // Skip if this change was triggered by undo/redo itself
    if (useHistoryStore.getState().isUndoRedoAction) {
      lastNodes = nodes;
      lastEdges = edges;
      return;
    }

    // Skip if there's no active stream (e.g., during load/unload)
    if (!useGraphStore.getState().activeStreamId) {
      lastNodes = nodes;
      lastEdges = edges;
      return;
    }

    // Capture the previous state as the snapshot to push
    const snapshotToPush: HistorySnapshot = {
      nodes: lastNodes,
      edges: lastEdges,
    };

    // Update last known state
    lastNodes = nodes;
    lastEdges = edges;

    // Debounce: batch rapid changes (like node dragging) into one snapshot
    if (historyTimer) {
      clearTimeout(historyTimer);
    }

    // Store the first snapshot in a debounce window
    if (!pendingSnapshot) {
      pendingSnapshot = snapshotToPush;
    }

    historyTimer = setTimeout(() => {
      if (pendingSnapshot) {
        useHistoryStore.getState().pushSnapshot(pendingSnapshot);
        pendingSnapshot = null;
      }
    }, 300);
  },
  {
    equalityFn: (a, b) => a.nodes === b.nodes && a.edges === b.edges,
  }
);
