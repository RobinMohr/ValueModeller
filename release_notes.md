# Release Notes — Value Modeller

## 2026-07-14T15:03 — Consistent Edge Styles & Animated Flow

**What changed:**
- Added `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` to the `<ReactFlow>` component in `flow-canvas.tsx`
- Added `animated: true` to all demo edges in `demo-data.ts`

**Impact:**
- All newly created connections now use smoothstep edges (matching demo data) instead of default bezier curves
- All edges (existing and new) display animated dashed flow lines showing directional data flow
- Eliminates visual inconsistency during live demos when presenters add new connections
- Makes the "flow" concept immediately obvious to non-technical viewers

**Files modified:**
- `src/components/canvas/flow-canvas.tsx`
- `src/utils/demo-data.ts`

## 2026-07-14T15:07 — Toolbar: Fit View & Reset Demo Buttons

**What changed:**
- Added **"Fit View"** button to the canvas toolbar — automatically zooms/pans to show all nodes with smooth animation (padding: 0.2, duration: 300ms). Essential for demo recovery when nodes go off-screen.
- Added **"Reset Demo"** button with confirmation UX — first click shows "Confirm Reset?" (red danger button), second click reloads demo data and fits view. Auto-cancels after 3 seconds if not confirmed.
- Refactored `FlowCanvas` to use `ReactFlowProvider` wrapper with `useReactFlow` hook for clean access to `fitView()` and `getViewport()`.
- Extracted toolbar into a `ToolbarPanel` child component (rendered inside `<ReactFlow>`) so `useReactFlow` hook works correctly.

**File changed:** `src/components/canvas/flow-canvas.tsx`

**Why:** Critical for demo presentations — presenters can now instantly recover from any zoom/pan state, and reset the model to a clean demo state without manually clearing localStorage.

## 2026-07-14T15:11 — Bug Fix: Side Panel Clears selectedNodeId on Close & Node Deletion

**What changed:**
- Fixed `closeSidePanel()` in `ui-store.ts` to clear `selectedNodeId` (sets it to `null`) in addition to closing the panel. Previously, the stale ID remained in state after the panel was closed.
- Added node deletion detection in `FlowCanvasInner` — when a node is deleted via keyboard (Backspace/Delete) on the canvas, the side panel automatically closes if the deleted node was the currently selected node.
- Wrapped `onNodesChange` with a `handleNodesChange` callback that inspects `NodeRemoveChange` events before delegating to the store.

**Files changed:**
- `src/store/ui-store.ts`
- `src/components/canvas/flow-canvas.tsx`

**Why:** Without this fix, deleting a node via keyboard while it was selected left `selectedNodeId` pointing to a non-existent node. This caused the side panel to show "Select a process node to view details" in a confusing state rather than closing cleanly. The fix ensures consistent UX regardless of how a node is deleted (keyboard vs. form Delete button).

---

## fix: Replace stale useMemo with direct Zustand selector in SipocForm
**Timestamp:** 2026-07-14T15:15+02:00

**What changed:**
- Replaced `useMemo` + `getNodeById` pattern in `SipocForm` with a direct Zustand selector: `useGraphStore((s) => selectedNodeId ? s.nodes.find((n) => n.id === selectedNodeId) : undefined)`.
- Removed unused `useMemo` import.
- Removed `getNodeById` store selector from the component since it's no longer needed there.

**Files changed:**
- `src/components/form/sipoc-form.tsx`

**Why:** The previous pattern used `useMemo` with `getNodeById` as a dependency. Since `getNodeById` is a stable function reference from the store, `useMemo` would never recalculate when node data actually changed in the store. The form worked due to React reconciliation coincidences, but this was a code smell that could cause stale data display bugs. The new pattern uses a direct Zustand selector that properly subscribes to store changes, ensuring the form always reflects the latest node data.
