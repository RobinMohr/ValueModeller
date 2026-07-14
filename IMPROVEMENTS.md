# Value Modeller — Improvement Suggestions

## Run: 2026-07-14T13:44 (QA Agent)

### Bugs Found

1. **Potential stale node data in SipocForm (Medium Severity)**
   - **File:** `src/components/form/sipoc-form.tsx`, line 18-21
   - **Description:** The `useMemo` hook for `node` depends on `getNodeById` from the store, but since `getNodeById` doesn't change reference between renders, `useMemo` won't recalculate when node data actually changes. This means the form may display stale data after a field is edited unless something else triggers a re-render.
   - **Reproduction:** Open a node, edit a field, close panel, reopen — verify data persists correctly. This should work due to React's reconciliation, but it's a code smell that could cause bugs later.
   - **Suggestion:** Instead of `useMemo` with `getNodeById`, derive the node directly from a selector: `const node = useGraphStore((s) => selectedNodeId ? s.nodes.find(n => n.id === selectedNodeId) : undefined);`

2. **No edge type specified for new connections (Low Severity)**
   - **File:** `src/store/graph-store.ts`, line 38
   - **Description:** When `onConnect` fires, it uses the default `addEdge` from `@xyflow/react` which doesn't set an edge `type`. However, the demo data in `src/utils/demo-data.ts` uses `type: 'smoothstep'` for all edges. This means newly-created connections will look different (default bezier) from the pre-existing demo edges (smoothstep).
   - **Reproduction:** Start the app, connect two nodes by dragging handles — the new edge will be a different shape than the demo edges.
   - **Fix:** In `graph-store.ts`, modify the `onConnect` handler to set `type: 'smoothstep'` on new edges, or set a `defaultEdgeOptions` on the `<ReactFlow>` component in `flow-canvas.tsx`.

3. **Side panel doesn't close when a node is deleted from canvas (Low Severity)**
   - **File:** `src/store/ui-store.ts`
   - **Description:** The `closeSidePanel` action sets `isSidePanelOpen: false` but doesn't clear `selectedNodeId`. If a node is deleted via the keyboard (Backspace/Delete) while selected on the canvas (not via the form's Delete button), the side panel remains open showing "Select a process node to view details" because `selectedNodeId` becomes orphaned.
   - **Reproduction:** Select a node on canvas (single click), press Delete/Backspace, observe panel state.
   - **Fix:** Listen for node deletion events in `FlowCanvas` and call `closeSidePanel()` if the deleted node matches the `selectedNodeId`.

---

### Critical (Must Fix for Demo)

1. **Inconsistent edge styles between demo data and user-created edges**
   - **Impact:** During a live demo, when a presenter adds a new connection, it will look visually different from the existing ones, appearing unprofessional.
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Fix:** Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` to the `<ReactFlow>` component. Animated edges add a subtle motion that looks impressive in demos and clarifies data flow direction.
   - **Effort:** ~5 minutes

2. **No visual confirmation of save state**
   - **Impact:** The header shows "Auto-saved" statically (file: `src/components/layout/app-shell.tsx`, line 17), but there's no actual feedback when data changes. Users can't tell if their work is actually persisted.
   - **File:** `src/components/layout/app-shell.tsx`
   - **Fix:** Add a simple state that flashes "Saving..." briefly when the Zustand store's `persist` middleware writes to localStorage, then shows "Saved ✓". The `persist` middleware supports `onRehydrateStorage` and custom storage events.
   - **Effort:** ~30 minutes

---

### High Impact / Low Effort (Do Today)

1. **Add animated edges for data flow visualization**
   - **What:** Set `animated: true` on all edges (both demo and new). Animated edges show directional flow with moving dashes, which is extremely effective in demos for showing how data flows from one process to the next.
   - **File:** `src/components/canvas/flow-canvas.tsx` (add to `defaultEdgeOptions`)
   - **File:** `src/utils/demo-data.ts` (add `animated: true` to demo edges)
   - **Effort:** ~5 minutes
   - **Impact:** Makes the demo immediately more impressive and communicates the "flow" concept visually.

2. **Add a toolbar with more actions (Reset/New Model, Fit View)**
   - **What:** Add a "Reset" button to clear the model and reload demo data, and a "Fit View" button that automatically zooms to fit all nodes. These are standard in diagramming tools and expected by users.
   - **File:** `src/components/canvas/flow-canvas.tsx` (Panel component already exists)
   - **Effort:** ~30 minutes
   - **Impact:** Shows the app is functional and polished during demo.

3. **Improve node visual design with SIPOC color coding**
   - **What:** The current node (`src/components/canvas/sipoc-node.tsx`) shows small colored badges (S, I, O, C counts). Consider adding a colored left border or gradient header to the node card based on its completion status (e.g., gray = empty, blue = partially filled, green = fully filled).
   - **File:** `src/components/canvas/sipoc-node.tsx`
   - **Effort:** ~30 minutes
   - **Impact:** Gives immediate visual feedback on process completeness without opening the form.

4. **Add edge labels showing output→input relationship**
   - **What:** When a connection is made between processes, the edge could show a label like "Confirmed Order →" to indicate what flows between processes. This is a key concept in value stream mapping — the connection represents output-to-input flow.
   - **File:** `src/components/canvas/flow-canvas.tsx` (add `edgeTypes` with a custom labeled edge)
   - **Effort:** ~1 hour
   - **Impact:** Demonstrates deep understanding of SIPOC methodology and impresses judges/viewers.

5. **Auto-layout nodes using dagre or elkjs**
   - **What:** Add a "Auto Layout" button that automatically arranges nodes in a left-to-right flow using a layout algorithm. The `dagre` library is lightweight and perfect for this.
   - **Effort:** ~1-2 hours (install dagre, write layout function, add button)
   - **Impact:** Very impressive in demos — shows that the tool understands graph topology.
   - **Reference:** React Flow docs recommend `dagre` for automatic layouts.

6. **Keyboard shortcuts panel/help**
   - **What:** Add a small help tooltip or `?` button showing available keyboard shortcuts (Delete to remove, Ctrl+Z to undo if implemented).
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Effort:** ~20 minutes
   - **Impact:** Shows polish and attention to UX.

---

### Nice to Have (If Time Permits)

1. **Undo/Redo support**
   - **What:** Implement undo/redo using a history stack in the graph store. Zustand has middleware patterns for this (`zustand/middleware` temporal).
   - **Effort:** ~2-3 hours
   - **Impact:** Professional-grade feature that shows maturity.

2. **Export to JSON / Import from JSON**
   - **What:** Add buttons to export the current model as a JSON file and import a previously saved model. This is within scope (it's not PDF/PNG export which is out of scope).
   - **Effort:** ~1 hour
   - **Impact:** Shows the data is portable and shareable.

3. **Dark mode toggle**
   - **What:** Add a theme toggle in the header. Tailwind makes this relatively easy with `dark:` variants.
   - **Effort:** ~2 hours
   - **Impact:** Looks modern and demonstrates technical competence.

4. **Connection validation (prevent cycles)**
   - **What:** Add validation to prevent users from creating connections that would form cycles in the graph (since value streams should be DAGs). React Flow supports `isValidConnection` prop.
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Effort:** ~1 hour
   - **Impact:** Shows domain knowledge — value streams flow in one direction.

5. **Node grouping/swimlanes**
   - **What:** Allow users to group processes by department or team using React Flow's Group Node feature.
   - **Effort:** ~3-4 hours
   - **Impact:** Advanced feature that maps to real organizational structures.

---

### Research Insights

1. **SIPOC Best Practices (from web research):**
   - SIPOC diagrams are most effective when they reveal "hidden dependencies, missing handoffs, and unclear ownership" (process.st). Our tool should make it easy to see where handoffs occur (connections) and who is responsible (Supplier/Customer fields).
   - The five-column table format is the traditional view, but our canvas approach adds value by showing branching/merging visually — this is our differentiator.
   - More than 45% of Fortune 500 companies use SIPOC diagrams (airacad.com), validating the use case.

2. **React Flow UX Patterns (from web research):**
   - Custom nodes can contain form inputs, charts, and multiple handles — we're already leveraging this well with SIPOC badges.
   - Auto-layout with dagre/ELK.js is a common pattern that significantly improves UX.
   - Animated edges are a simple but effective way to communicate flow direction.
   - The library is described as "a UI library, not a graph-theory engine" — we should own the layout logic (reactlibs.dev).

3. **Demo Presentation Tips:**
   - Start with a pre-populated example that shows branching/merging (we already have this ✓).
   - Show real-time editing: click node → edit → see changes reflected immediately.
   - Animated edges make the "flow" concept immediately obvious to non-technical viewers.
   - Auto-layout is a "wow" feature for demos — it shows the tool understands the graph structure.
   - A clean, minimal UI with good color coding communicates professionalism.

---

*Generated by QA & Improvement Research Agent*

## Run: 2026-07-14T14:16 (QA Agent — Second Pass)

### Bugs Found

1. **New connections have different edge style from demo edges (Still Present — Severity: Medium)**
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Status:** Previously reported in first pass, NOT YET FIXED.
   - **Description:** The `<ReactFlow>` component in `flow-canvas.tsx` does not set `defaultEdgeOptions`. Demo data edges use `type: 'smoothstep'` (in `src/utils/demo-data.ts`), but the `onConnect` handler in `graph-store.ts` (line 38) uses `addEdge` from `@xyflow/react` without specifying a type. User-created connections render as default bezier curves while demo edges are smoothstep.
   - **Reproduction:** Connect two nodes by dragging handles — the new edge looks different from existing demo edges.
   - **Fix:** Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` to the `<ReactFlow>` component in `flow-canvas.tsx`.
   - **Effort:** ~5 minutes

2. **Side panel `selectedNodeId` not cleared on node deletion from canvas (Still Present — Severity: Low)**
   - **File:** `src/store/ui-store.ts`, line 24
   - **Status:** Previously reported in first pass, NOT YET FIXED.
   - **Description:** `closeSidePanel()` sets `isSidePanelOpen: false` but does NOT clear `selectedNodeId`. If a node is deleted while selected on the canvas (via keyboard Delete/Backspace rather than via the form's Delete button), the `selectedNodeId` becomes stale. The panel transitions to showing "Select a process node to view details" because the `useMemo` in `sipoc-form.tsx` returns undefined for the deleted node — this works by accident but is brittle.
   - **Reproduction:** Single-click a node on canvas → press Delete/Backspace → observe that `selectedNodeId` in ui-store still holds the deleted node's ID.
   - **Fix:** In `ui-store.ts`, update `closeSidePanel()` to also set `selectedNodeId: null`. Additionally, listen for node deletion events in `FlowCanvas` and call `closeSidePanel()` if the deleted node matches `selectedNodeId`.
   - **Effort:** ~15 minutes

3. **Stale node data pattern in SipocForm (Still Present — Severity: Low, Code Smell)**
   - **File:** `src/components/form/sipoc-form.tsx`, lines 18-21
   - **Status:** Previously reported, NOT YET FIXED.
   - **Description:** The `useMemo` hook derives `node` from `getNodeById`, but since `getNodeById` doesn't change reference between renders, `useMemo` may not recalculate when node data changes. Currently works due to React reconciliation but is a code smell.
   - **Fix:** Replace `useMemo` with a direct Zustand selector: `const node = useGraphStore((s) => selectedNodeId ? s.nodes.find(n => n.id === selectedNodeId) : undefined);`
   - **Effort:** ~5 minutes

4. **"Auto-saved" badge is static and misleading (Severity: Low)**
   - **File:** `src/components/layout/app-shell.tsx`, line 17
   - **Description:** The header displays a static "Auto-saved" badge that never changes. There is no actual visual feedback when data is persisted to localStorage by the Zustand persist middleware. Users cannot tell if their data is actually being saved.
   - **Suggestion:** Add a brief "Saving..." animation or timestamp when the persist middleware writes. Zustand's persist middleware supports `onRehydrateStorage` and can be extended with custom storage events.
   - **Effort:** ~30 minutes

---

### Critical (Must Fix for Demo)

1. **Inconsistent edge styles between demo data and user-created edges**
   - **Why critical:** During a live demo, the presenter will create new connections. If those look visually different from existing ones, it appears buggy and unprofessional.
   - **Fix:** Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` to `<ReactFlow>` in `src/components/canvas/flow-canvas.tsx`.
   - **Effort:** ~5 minutes, massive visual payoff.

2. **No "Fit View" or "Reset" buttons in toolbar**
   - **Why critical:** During a demo, the presenter may zoom/pan to a state where nodes are off-screen. Without a "Fit View" button, recovering requires manual zoom/pan which looks unprofessional. A "Reset" button is also needed to reload demo data cleanly.
   - **File:** `src/components/canvas/flow-canvas.tsx` — the `<Panel>` component already exists with one button.
   - **Fix:** Add "Fit View" (using `reactFlowInstance.current?.fitView()`) and "Reset" buttons.
   - **Effort:** ~20 minutes

---

### High Impact / Low Effort (Do Today)

1. **Add animated edges for data flow visualization** ⚡
   - **What:** Set `animated: true` on all edges. Animated dashed lines show directional flow, which is extremely effective in demos.
   - **File:** `src/components/canvas/flow-canvas.tsx` (add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}`)
   - **File:** `src/utils/demo-data.ts` (add `animated: true` to each edge)
   - **Effort:** ~5 minutes
   - **Impact:** 🔥 Makes the demo immediately more impressive and communicates the "flow" concept visually.

2. **Add a toolbar with Fit View and Reset actions** ⚡
   - **What:** "Fit View" auto-zooms to show all nodes. "Reset" clears localStorage and reloads demo data.
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Effort:** ~20 minutes
   - **Impact:** Essential for smooth demo presentations.

3. **Improve node completion indicators** 
   - **What:** Add a colored left border to nodes based on completion (gray = empty, blue = partially filled, green = all SIPOC fields have at least one entry). The current badges (S:0, I:0, O:0, C:0) are informative but a color indicator gives instant visual feedback.
   - **File:** `src/components/canvas/sipoc-node.tsx`
   - **Effort:** ~30 minutes
   - **Impact:** Shows process completeness at a glance without opening the form.

4. **Auto-layout with dagre** 
   - **What:** Add an "Auto Layout" button that arranges nodes left-to-right using the `dagre` library. This is a standard pattern recommended by React Flow docs.
   - **Effort:** ~1-2 hours (install dagre, write layout function, add button)
   - **Impact:** Very impressive in demos — shows the tool understands graph topology.
   - **Reference:** React Flow official examples recommend dagre for automatic layouts. See: https://reactflow.dev/examples/layout/auto-layout

5. **Edge labels showing output→input flow**
   - **What:** Add labels on edges indicating what flows between processes (e.g., "Confirmed Order →"). This demonstrates deep understanding of SIPOC methodology.
   - **File:** Custom edge component or `defaultEdgeOptions` with label support
   - **Effort:** ~1 hour
   - **Impact:** Impresses viewers by showing the connection represents output-to-input flow.

---

### Nice to Have (If Time Permits)

1. **Undo/Redo support**
   - Use Zustand temporal middleware or a custom history stack.
   - **Effort:** ~2-3 hours
   - **Impact:** Professional-grade feature.

2. **Export/Import JSON**
   - Allow exporting the model as JSON file and importing previously saved models. This is within scope (not PDF/PNG).
   - **Effort:** ~1 hour
   - **Impact:** Shows data portability.

3. **Connection validation (prevent cycles)**
   - Value streams should be DAGs. Use React Flow's `isValidConnection` prop.
   - **Effort:** ~1 hour
   - **Impact:** Shows domain knowledge.

4. **Keyboard shortcuts help overlay**
   - Show available shortcuts (Delete to remove, etc.) in a small tooltip or help panel.
   - **Effort:** ~20 minutes
   - **Impact:** Polish and UX attention.

---

### Research Insights (New Findings)

1. **SIPOC Diagram Market Validation:**
   - Multiple major productivity platforms (Asana, Monday.com, Miro, Atlassian, Creately) offer SIPOC diagramming features, validating strong market demand.
   - The traditional SIPOC format is a five-column table, but our canvas approach adds unique value by showing branching/merging visually — this is our key differentiator from table-based tools.

2. **React Flow Architecture Patterns (from official docs and community):**
   - React Flow is described as "a UI library, not a graph-theory engine" — we should own the layout logic separately.
   - Auto-layout with dagre/ELK.js is a standard pattern well-documented in React Flow's official examples.
   - The library supports a `useAutoLayout` hook pattern for dynamic layout — this could be implemented for our "Auto Layout" button.
   - Custom nodes can be highly interactive (containing forms, charts, buttons) — our SIPOC badge approach is good but could be enhanced.

3. **Demo Presentation Strategy:**
   - Start with pre-populated data showing branching/merging (we already do this ✓).
   - Animated edges make the "flow" concept immediately obvious to non-technical viewers.
   - Auto-layout is a "wow" feature that shows the tool understands graph structure.
   - The most impactful quick wins are: animated edges (~5 min), fit view button (~10 min), and consistent edge styling (~5 min) — total ~20 minutes for major visual improvement.

---

### Priority Action Items (Ordered by Impact/Effort Ratio)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` | 5 min | 🔥🔥🔥 |
| 2 | Add `animated: true` to demo edges | 5 min | 🔥🔥🔥 |
| 3 | Add "Fit View" button | 10 min | 🔥🔥🔥 |
| 4 | Add "Reset" button | 15 min | 🔥🔥 |
| 5 | Fix `closeSidePanel` to clear `selectedNodeId` | 15 min | 🔥🔥 |
| 6 | Fix stale node data pattern in SipocForm | 5 min | 🔥 |
| 7 | Node completion color indicator | 30 min | 🔥🔥 |
| 8 | Auto-layout with dagre | 1-2 hr | 🔥🔥🔥 |

---

*Generated by QA & Improvement Research Agent — Second Pass*

## Run: 2026-07-14T14:18 (QA Agent — Third Pass)

### Puppeteer Visual Inspection Results

**Environment:** App running at http://localhost:5173, tested via Puppeteer.

1. **Initial Load — PASS ✓**
   - The app loads correctly with 4 SIPOC process nodes connected by smoothstep edges.
   - Branching/merging pattern is clearly visible (1 source → 2 targets → 1 merge).
   - The header shows "Value Modeller" title with the static "Auto-saved" badge.
   - MiniMap, Controls, and Background grid are all rendering correctly.
   - The "+ Add Process" button is visible in the top-left panel.

2. **Node Click (Single Click) — PASS ✓**
   - Clicking a node selects it (visible ring/border highlight applied).
   - The side panel does NOT open on single click — this is by design (requires double-click).
   - Selection state is clearly visible with primary-colored border and ring.

3. **Add Process Button — PASS ✓**
   - Clicking "+ Add Process" creates a new "New Process" node on the canvas.
   - The side panel opens immediately with the "Process Details" form.
   - The form shows the process name input, description textarea, and all 4 SIPOC sections (Suppliers, Inputs, Outputs, Customers).
   - A "Delete Process" button is present at the bottom of the side panel.

4. **Edge Styling — BUG STILL PRESENT (Previously Reported)**
   - Demo edges use `type: 'smoothstep'` styling.
   - New connections created by users will default to bezier curves (different appearance).
   - **Status:** NOT YET FIXED from previous runs.
   - **Fix:** Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` to `<ReactFlow>` in `flow-canvas.tsx`.

5. **Missing "Fit View" and "Reset" Buttons — STILL MISSING**
   - Only one button ("+ Add Process") exists in the toolbar panel.
   - **Status:** NOT YET IMPLEMENTED from previous runs.
   - These are essential for demo presentations.

---

### Bugs Found (Confirmed from Visual Inspection)

1. **Inconsistent edge styles (Still Present — Severity: Medium)**
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Issue:** No `defaultEdgeOptions` prop on `<ReactFlow>` component. Demo edges are smoothstep; user-created edges will be default bezier.
   - **Fix:** Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}`.
   - **Effort:** ~5 minutes

2. **Side panel `selectedNodeId` not cleared on deletion (Still Present — Severity: Low)**
   - **File:** `src/store/ui-store.ts`, line 24
   - **Issue:** `closeSidePanel()` sets `isSidePanelOpen: false` but does NOT clear `selectedNodeId`. If a node is deleted via keyboard while selected on canvas, the `selectedNodeId` becomes stale.
   - **Fix:** Update `closeSidePanel()` to also set `selectedNodeId: null`.
   - **Effort:** ~10 minutes

3. **Stale node data in SipocForm (Still Present — Severity: Low, Code Smell)**
   - **File:** `src/components/form/sipoc-form.tsx`, lines 18-21
   - **Issue:** `useMemo` with `getNodeById` — since `getNodeById` doesn't change reference between renders, `useMemo` may not recalculate when node data changes.
   - **Fix:** Replace with direct Zustand selector: `const node = useGraphStore((s) => selectedNodeId ? s.nodes.find(n => n.id === selectedNodeId) : undefined);`
   - **Effort:** ~5 minutes

4. **Static "Auto-saved" badge (Still Present — Severity: Low)**
   - **File:** `src/components/layout/app-shell.tsx`, line 17
   - **Issue:** Badge is static and never changes, providing no actual feedback about save state.
   - **Effort:** ~30 minutes for a proper solution

---

### Critical (Must Fix for Demo)

1. **Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}`** ⚡
   - **Why:** This single change fixes the inconsistent edge styling AND adds animated flow visualization.
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Effort:** ~5 minutes
   - **Impact:** 🔥🔥🔥 Massive visual improvement for minimal effort.

2. **Add "Fit View" button to toolbar** ⚡
   - **Why:** Presenters may zoom/pan into a state where nodes are off-screen. "Fit View" is essential for recovering gracefully.
   - **File:** `src/components/canvas/flow-canvas.tsx` (use `reactFlowInstance.current?.fitView()`)
   - **Effort:** ~10 minutes
   - **Impact:** 🔥🔥🔥 Essential for smooth demo presentations.

3. **Add "Reset" button to toolbar** ⚡
   - **Why:** Needed to reload demo data cleanly during presentations.
   - **File:** `src/components/canvas/flow-canvas.tsx`
   - **Effort:** ~15 minutes
   - **Impact:** 🔥🔥 Shows the app is functional and polished.

---

### High Impact / Low Effort (Do Today)

1. **Add `animated: true` to demo edges in demo-data.ts** ⚡
   - Combined with `defaultEdgeOptions`, this ensures all edges (existing and new) show directional flow animation.
   - **File:** `src/utils/demo-data.ts`
   - **Effort:** ~5 minutes
   - **Impact:** 🔥🔥🔥

2. **Fix `closeSidePanel` to also clear `selectedNodeId`** ⚡
   - Prevents stale state and potential bugs when nodes are deleted.
   - **File:** `src/store/ui-store.ts`
   - **Effort:** ~10 minutes
   - **Impact:** 🔥🔥

3. **Replace stale `useMemo` pattern in SipocForm** ⚡
   - Fixes a code smell that could cause bugs later.
   - **File:** `src/components/form/sipoc-form.tsx`
   - **Effort:** ~5 minutes
   - **Impact:** 🔥

4. **Node completion color indicator**
   - Add a colored left border based on completion status (gray = empty, blue = partially filled, green = all fields filled).
   - **File:** `src/components/canvas/sipoc-node.tsx`
   - **Effort:** ~30 minutes
   - **Impact:** 🔥🔥

5. **Auto-layout with dagre** 🌟
   - Add an "Auto Layout" button that arranges nodes left-to-right using the `dagre` library.
   - React Flow has NO built-in auto-layout feature, but dagre integration is a well-documented, officially-recommended pattern.
   - **Reference:** https://reactflow.dev/examples/layout/dagre
   - **Effort:** ~1-2 hours
   - **Impact:** 🔥🔥🔥 This is the top "wow" feature for demos.

---

### Nice to Have (If Time Permits)

1. **Undo/Redo** — 2-3 hours, professional-grade feature.
2. **Export/Import JSON** — 1 hour, shows data portability.
3. **Connection validation (prevent cycles)** — 1 hour, DAG enforcement.
4. **Keyboard shortcuts help overlay** — 20 minutes, polish.

---

### Research Insights (New Findings — Third Pass)

1. **SIPOC Diagram Best Practices (2025-2026 sources):**
   - Multiple major platforms (Asana, Monday.com, Miro, Atlassian, Creately, MockFlow, ProjectManager.com) offer SIPOC diagramming — confirming strong market demand.
   - Key insight: SIPOC diagrams are most effective as "one-page frameworks" that define a process end-to-end. Our canvas approach adds unique value by showing branching/merging visually.
   - Best practices emphasize: clear boundaries, highlighting core structure without documenting every task, and helping teams quickly align on how work flows from suppliers to customers.
   - Our tool's hybrid approach (canvas for topology + form for detail) is a strong differentiator from the table-based approach used by most tools.

2. **React Flow + Dagre Auto-Layout (Confirmed as Critical Feature):**
   - React Flow explicitly states: "React Flow has no built-in layouting but it can be achieved with a third party library like elkjs or dagre."
   - Dagre is described as "a simple library for layouting directed graphs" with "minimal configuration options and a focus on speed over choosing the most optimal layout."
   - Official example at https://reactflow.dev/examples/layout/dagre shows the exact integration pattern we need.
   - Key dagre features: configurable direction (TB/LR), explicit node-dimension strategies, deterministic edge/node placement.
   - This is THE recommended approach for auto-layout in React Flow apps.

3. **Demo Impact Assessment:**
   - The three highest-impact changes for a live demo are all achievable in ~20 minutes total:
     1. Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` (~5 min)
     2. Add `animated: true` to demo edges (~5 min)
     3. Add "Fit View" button (~10 min)
   - Combined, these three changes transform the visual quality of the demo dramatically.
   - The dagre auto-layout feature (1-2 hours) is the single most impressive "wow" feature for demonstrations.

---

### Priority Action Items (Ordered by Impact/Effort Ratio)

| # | Item | Effort | Impact | Status |
|---|------|--------|--------|--------|
| 1 | Add `defaultEdgeOptions={{ type: 'smoothstep', animated: true }}` | 5 min | 🔥🔥🔥 | NOT DONE |
| 2 | Add `animated: true` to demo edges | 5 min | 🔥🔥🔥 | NOT DONE |
| 3 | Add "Fit View" button | 10 min | 🔥🔥🔥 | NOT DONE |
| 4 | Add "Reset" button | 15 min | 🔥🔥 | NOT DONE |
| 5 | Fix `closeSidePanel` to clear `selectedNodeId` | 10 min | 🔥🔥 | NOT DONE |
| 6 | Fix stale node data pattern in SipocForm | 5 min | 🔥 | NOT DONE |
| 7 | Node completion color indicator | 30 min | 🔥🔥 | NOT DONE |
| 8 | Auto-layout with dagre | 1-2 hr | 🔥🔥🔥 | NOT DONE |

---

*Generated by QA & Improvement Research Agent — Third Pass*
