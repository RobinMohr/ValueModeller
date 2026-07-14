---
inclusion: fileMatch
fileMatchPattern: "src/components/canvas/**"
---

# Canvas & Graph — Implementation Guide

## React Flow Setup

The canvas is powered by React Flow. Key concepts:

- **Nodes** = SIPOC process steps (custom node component)
- **Edges** = Output→Input connections between processes
- **Viewport** = Pannable, zoomable canvas area

## Custom Node: `SipocNode`

Each node renders a compact card showing:
- Process name (title)
- A visual indicator of completeness (how many SIPOC fields are filled)
- Connection handles (top = input, bottom = output)

```tsx
// Minimal structure
interface SipocNodeData {
  id: string;
  processName: string;
  supplier: string;
  input: string;
  process: string;
  output: string;
  customer: string;
}
```

## Handles & Connections

- **Source handle** (bottom of node): represents the Output flowing downstream
- **Target handle** (top of node): represents the Input received from upstream
- Allow multiple connections from a single source (branching)
- Allow multiple connections to a single target (merging)
- Edge type: `smoothstep` for clean visual curves

## Interaction Patterns

| Action | Behavior |
|--------|----------|
| Click node | Select node, open SIPOC form in side panel |
| Drag node | Reposition on canvas |
| Drag from handle | Create new edge (connection) |
| Double-click canvas | Add new empty node at click position |
| Delete key (node selected) | Remove node + its edges |
| Delete key (edge selected) | Remove edge only |

## Canvas Toolbar

Provide a minimal toolbar:
- **Add Node** button (alternative to double-click)
- **Fit View** button (zoom to fit all nodes)
- **Delete Selected** button

## React Flow Configuration

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onNodeClick={handleNodeClick}
  nodeTypes={nodeTypes}
  fitView
  snapToGrid
  snapGrid={[16, 16]}
>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
```

## Performance Notes

- Use `useCallback` for all React Flow event handlers
- Memoize custom node components with `React.memo`
- Keep node data minimal; heavy SIPOC details live in the store, not in node rendering
