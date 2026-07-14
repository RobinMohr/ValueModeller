---
inclusion: fileMatch
fileMatchPattern: "src/store/**,src/types/**"
---

# Data Model & State Management — Implementation Guide

## Core Types

```typescript
// src/types/sipoc.types.ts

interface SipocData {
  processName: string;
  supplier: string;
  input: string;
  process: string;
  output: string;
  customer: string;
}

interface SipocNode {
  id: string;
  position: { x: number; y: number };
  data: SipocData;
}

interface SipocEdge {
  id: string;
  source: string;  // node ID
  target: string;  // node ID
}

interface ValueStreamModel {
  id: string;
  name: string;
  nodes: SipocNode[];
  edges: SipocEdge[];
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}
```

## Zustand Store Design

### Graph Store (`src/store/graph-store.ts`)

Primary store managing the value stream model:

```typescript
interface GraphStore {
  // Data
  nodes: Node<SipocData>[];
  edges: Edge[];
  modelName: string;

  // Actions — nodes
  addNode: (position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<SipocData>) => void;

  // Actions — edges
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;

  // Actions — React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions — persistence
  saveModel: () => void;
  loadModel: () => void;
  clearModel: () => void;
}
```

### UI Store (`src/store/ui-store.ts`)

Manages UI state separate from data:

```typescript
interface UIStore {
  selectedNodeId: string | null;
  isPanelOpen: boolean;

  selectNode: (nodeId: string) => void;
  deselectNode: () => void;
  togglePanel: () => void;
}
```

## Persistence Strategy

- Use Zustand `persist` middleware on the graph store
- Storage key: `value-modeller-graph`
- Persist: `nodes`, `edges`, `modelName`
- Don't persist UI state (panel open, selected node)

```typescript
export const useGraphStore = create<GraphStore>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'value-modeller-graph',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        modelName: state.modelName,
      }),
    }
  )
);
```

## ID Generation

Use `crypto.randomUUID()` for all IDs (nodes, edges). Edge IDs can follow the pattern: `edge-{sourceId}-{targetId}` for readability during debugging.

## Default New Node

When adding a node, create it with empty SIPOC fields:

```typescript
const newNode: Node<SipocData> = {
  id: crypto.randomUUID(),
  type: 'sipocNode',
  position,
  data: {
    processName: 'New Process',
    supplier: '',
    input: '',
    process: '',
    output: '',
    customer: '',
  },
};
```

## Demo Data

Provide a function to seed a sample model for demo purposes (e.g., a simple 3-node order fulfilment flow: Order Received → Process Order → Ship to Customer).
