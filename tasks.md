# Implementation Tasks — Value Modeller

## Stream C — Project Scaffold (do first, unblocks A & B)

### C1: Initialize Vite + React + TypeScript project
- `npm create vite@latest . -- --template react-ts`
- Install dependencies: `reactflow`, `zustand`, `tailwindcss`, `postcss`, `autoprefixer`
- Configure Tailwind CSS
- Verify dev server runs

### C2: Set up project structure
- Create folder structure: `src/components/{canvas,form,layout,ui}`, `src/store`, `src/types`, `src/utils`
- Add `cn()` utility (clsx + tailwind-merge)
- Add base Tailwind config with theme colors

### C3: Create app shell layout
- Header with app title
- Main area: split layout (canvas left, side panel right)
- Side panel hidden by default, slides in when node selected
- Responsive container setup

---

## Stream A — Canvas & Graph

### A1: Define graph data types
- `SipocNodeData` interface (supplier, input, process, output, customer fields)
- Node and edge type definitions for React Flow
- ID generation utility (`crypto.randomUUID()`)

### A2: Create custom SIPOC node component
- Visual card showing process name
- Color-coded or styled distinctly
- Handles for source (bottom) and target (top) connections
- Selected state styling

### A3: Set up React Flow canvas
- Canvas component with React Flow provider
- Pan, zoom, minimap controls
- Background grid/dots
- Snap-to-grid for positioning

### A4: Implement add/delete node
- Toolbar button to add new node (default position or center of viewport)
- Delete selected node (keyboard shortcut + button)
- Remove associated edges on node delete

### A5: Implement edge connections
- Drag from handle to handle to create connections
- Support branching (one source → multiple targets)
- Support merging (multiple sources → one target)
- Delete edge on click or selection + delete key

---

## Stream B — SIPOC Form & State

### B1: Create Zustand graph store
- Nodes array, edges array
- Actions: addNode, removeNode, updateNodeData, addEdge, removeEdge
- `onNodesChange`, `onEdgesChange` handlers for React Flow
- Selected node ID state
- Persist middleware → localStorage

### B2: Create SIPOC detail form
- Side panel component with form fields:
  - Process name (text input)
  - Supplier (textarea)
  - Input (textarea)
  - Process description (textarea)
  - Output (textarea)
  - Customer (textarea)
- Binds to selected node's data
- Auto-saves on field change (debounced)

### B3: Create UI state store
- Side panel open/closed
- Selected node tracking
- Any transient UI state

---

## Stream C (continued) — Integration & Polish

### C4: Wire canvas ↔ form interaction
- Click node on canvas → set selected node → open side panel with form
- Click canvas background → deselect → close side panel
- Form updates reflect in node display

### C5: Add demo data
- Pre-populated example value stream (3-5 nodes with branching)
- Load as default if no saved state exists
- Demonstrates branching and merging

### C6: Polish & demo readiness
- Clean up styling, consistent spacing
- Ensure smooth interactions for live demo
- Add a "New Model" / "Reset" button

---

## Execution Order (parallel)

```
Time →
┌─────────────┬─────────────────────────────────────────┐
│ Stream C    │ C1 → C2 → C3                            │
│ Stream A    │      A1 → A2 → A3 → A4 → A5            │
│ Stream B    │      B1 → B2 → B3                       │
│ Integration │                    C4 → C5 → C6         │
└─────────────┴─────────────────────────────────────────┘
```

C1-C2 must complete first (scaffold). Then A, B run in parallel. C4-C6 integrate at the end.
