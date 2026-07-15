# IMPROVEMENTS.md — QA Research Log

## [2026-07-14T23:50] QA Research Run

**App Status:** NOT RUNNING at http://localhost:5173 (ERR_CONNECTION_REFUSED). Puppeteer visual testing skipped.

### Code Review Findings

1. **Process Metrics form dark mode bug (Priority 2)**
   - The "Process Metrics" section in `sipoc-form.tsx` (Cycle Time, Lead Time, Value Add %) is missing `dark:` Tailwind variants on labels, inputs, and headings.
   - The `SipocTextAreaField` component above correctly uses `dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:text-gray-300`, but the metrics inputs have none.
   - Also affects the "Additional Details" section heading (`text-gray-700` without dark variant).
   - **Task created:** `tasks/2_fix-process-metrics-dark-mode.json`

2. **localStorage QuotaExceededError — no error handling (Priority 2)**
   - `value-stream-store.ts` uses Zustand `persist` middleware with localStorage but provides no error handling.
   - localStorage has a ~5MB limit. If a user creates many streams with large SIPOC data, writes will silently fail or throw unhandled DOMException.
   - The coding standards document (`coding-standards.md`) explicitly states: "Wrap localStorage operations in try/catch" and "Show user-friendly toast/notification on save/load errors" — this is not implemented.
   - **Task created:** `tasks/2_localstorage-error-handling.json`

3. **SmartEdge component not memoized (Priority 3)**
   - Per React Flow official performance guide: custom edge components should be memoized with `React.memo`.
   - `SipocNodeComponent` is correctly `memo()`-wrapped, but `SmartEdge` and `LabeledEdge` are not.
   - SmartEdge performs expensive obstruction detection + path computation on every render — memo would skip re-renders when props haven't changed during pan/zoom.
   - **Task created:** `tasks/3_memoize-smart-edge-component.json`

4. **No loading state when navigating between streams (Priority 3)**
   - Clicking a stream card on the landing page navigates to `/stream/:id` which calls `loadStream()`.
   - There's a brief "flash of empty canvas" before React Flow renders the nodes. No skeleton/spinner is shown.
   - Minor UX issue but noticeable during demos when switching between streams.
   - **Task created:** `tasks/3_stream-navigation-loading-state.json`

5. **Node hover tooltip for SIPOC preview (Priority 4)**
   - React Flow UI now has an official `NodeTooltip` component (released 2025) that shows rich content on hover.
   - Currently users must double-click or open the side panel to see SIPOC data. A hover tooltip showing a preview would reduce friction during reviews.
   - **Task created:** `tasks/4_node-hover-tooltip-preview.json`

### Research Insights

**React Flow Performance (reactflow.dev/learn/advanced-use/performance):**
- Memoize all custom node and edge components with `React.memo`
- Memoize all handler functions with `useCallback`
- Avoid accessing the full `nodes` array in custom node components (causes re-render on every drag)
- Our code already uses `subscribeWithSelector` in graph-store which is good
- Consider collapsing hidden nodes for very large streams (10+ nodes)

**React Flow UI Components (reactflow.dev/ui):**
- New `NodeTooltip` component — hover preview built on NodeToolbar
- New `NodeSearch` component — official search UI (we already have custom implementation)
- New `ZoomSlider` component — slider-based zoom control
- New `DevTools` component — React Flow debugging panel
- New `StatusIndicator` component — visual node status badges

**Value Stream Mapping Best Practices:**
- "Current state vs future state" comparison is a key VSM methodology feature
- Process time breakdown (value-add vs wait time) is the core analytical insight
- We already have CT/LT/VA% fields which is excellent — this is a differentiator
- Standard VSM symbols include inventory triangles, push/pull arrows — could be future node types

**Zustand Performance Patterns:**
- `subscribeWithSelector` (already used) prevents full-store re-renders
- Granular selectors in components are important — our code does this well
- The auto-save subscription with 500ms debounce is appropriate

### Tasks Created This Run

| File | Priority | Type | Title |
|------|----------|------|-------|
| `2_fix-process-metrics-dark-mode.json` | 2 (high) | problem | Fix Process Metrics form fields missing dark mode styles |
| `2_localstorage-error-handling.json` | 2 (high) | problem | Add localStorage error handling to prevent silent data loss |
| `3_memoize-smart-edge-component.json` | 3 (medium) | improvement | Memoize SmartEdge component for performance |
| `3_stream-navigation-loading-state.json` | 3 (medium) | improvement | Add loading/transition state when navigating between streams |
| `4_node-hover-tooltip-preview.json` | 4 (low) | idea | Add node hover tooltip with SIPOC data preview |

### Overall Assessment

The codebase is in excellent shape for a hackathon project. Most features are well-implemented with proper accessibility, dark mode, and keyboard navigation. The main gaps are:
- Minor dark mode inconsistency in the form
- Missing defensive localStorage handling
- Performance optimization opportunity (edge memoization)
- UX polish opportunities (loading states, hover previews)

No critical bugs detected in code review. The app couldn't be tested visually because the dev server is not running.


## [2026-07-15T08:54] QA Research & Code Quality Review Run

**App Status:** NOT RUNNING at http://localhost:5173 (port 5173 not listening). Puppeteer visual testing skipped.

### Code Quality Findings (SOLID & DRY Focus)

1. **SmartEdge subscribes to full nodes array — critical performance anti-pattern (Priority 2)**
   - `smart-edge.tsx` line 43: `const nodes = useGraphStore((s) => s.nodes)` subscribes every SmartEdge instance to the entire nodes array.
   - Per React Flow official performance guide: "One of the most common performance pitfalls is directly accessing the nodes or edges in components."
   - Every node drag/position change triggers re-render of ALL SmartEdge instances → expensive obstruction detection + path computation on each.
   - The `void getNodes` on line 93 shows awareness of the issue but incorrect solution.
   - **SOLID:** Dependency Inversion violation — edge component subscribes to mutable state it should access imperatively.
   - **Task created:** `tasks/2_smart-edge-nodes-array-performance.json`

2. **Duplicated edge label editing logic — 95% copy-paste (Priority 2)**
   - `SmartEdge` and `LabeledEdge` contain ~60 lines of identical inline label editing code.
   - Same state: `isEditing`, `editValue`, `inputRef`.
   - Same effects: focus/select on edit mode.
   - Same handlers: `handleDoubleClick`, `commitEdit`, `handleKeyDown`, `handleBlur`.
   - Same rendering: `EdgeLabelRenderer` div with conditional input/span.
   - Secondary bug: LabeledEdge label lacks dark mode classes (SmartEdge has them).
   - **SOLID:** Single Responsibility — edge components handle path computation AND editing UI.
   - **DRY:** Extract `EdgeLabelEditor` shared component.
   - **Task created:** `tasks/2_extract-shared-edge-label-editor.json`

3. **StreamMetadataForm missing ALL dark mode styles (Priority 2)**
   - The entire modal renders with only light-mode classes.
   - In dark mode: jarring white box with poor contrast against dark app chrome.
   - No `dark:` variants on any element (container, headings, labels, inputs, borders).
   - **Task created:** `tasks/2_stream-metadata-form-dark-mode.json`

4. **FlowCanvasInner has 6+ responsibilities in 300+ lines (Priority 3)**
   - Context menu, clipboard, helper lines, group drag detection, keyboard shortcuts, connection validation.
   - Each concern has its own state + effects + callbacks interleaved together.
   - The single `useEffect` for keyboard shortcuts alone handles undo/redo + copy + paste + duplicate (40 lines).
   - **SOLID:** Single Responsibility Principle violation.
   - Fix: Extract `useCanvasContextMenu`, `useCanvasClipboard`, `useHelperLines`, `useGroupDragDetection` hooks.
   - **Task created:** `tasks/3_extract-flow-canvas-concerns.json`

5. **StreamStatsPanel missing dark mode styles (Priority 3)**
   - `StatBadge` component and all section elements use only light-mode Tailwind classes.
   - Panel container, headings, tag pills, list items all lack `dark:` variants.
   - Inconsistent with the rest of the app which has comprehensive dark mode support.
   - **Task created:** `tasks/3_stream-stats-panel-dark-mode.json`

6. **Dialog accessibility gaps: no focus trap, missing role='dialog' (Priority 3)**
   - `CreateStreamDialog` in landing-page.tsx: no `role="dialog"`, no `aria-modal="true"`, no focus trap, no Escape handler.
   - `StreamMetadataForm`: same issues — screen readers won't announce as dialog.
   - Users can Tab out of modals into background content.
   - **Task created:** `tasks/3_landing-page-create-dialog-accessibility.json`

### Research Insights

**React Flow Performance (July 2025 official guide — reactflow.dev/learn/advanced-use/performance):**
- Critical: "Components provided as props to `<ReactFlow>`, including custom node and edge components, should either be memoized using React.memo or declared outside the parent component"
- Critical: "Avoid accessing nodes in components" — our SmartEdge violates this directly
- Recommendation: Use `useStoreApi()` for imperative access when you need nodes but don't want to subscribe
- Our `nodeTypes` and `edgeTypes` objects are correctly defined outside the component ✓
- Functions passed as props are correctly memoized with useCallback ✓

**Zustand Best Practices 2025 (multiple sources):**
- Use multiple small stores (we have 5 stores — graph, ui, history, value-stream, toast, theme — good ✓)
- Always use selectors for subscription granularity (our code does this well ✓)
- `subscribeWithSelector` middleware (already in use on graph-store ✓)
- For derived data that creates new arrays: use `useShallow` from zustand/react
- Consider splitting actions from state to reduce bundle size in large apps

**Value Stream Mapping Tools (Miro, Lucidchart, Visual Paradigm):**
- Current-state vs future-state comparison is a key differentiating feature
- Process time breakdown (value-add vs wait time) — we have CT/LT/VA% fields ✓
- Swimlanes for team/department grouping — we have group nodes ✓
- AI-assisted VSM generation (Visual Paradigm has this) — could be a future differentiator
- Standard VSM symbols: inventory triangles, push/pull arrows, electronic info flow vs physical material flow

### Tasks Created This Run

| File | Priority | Type | Title |
|------|----------|------|-------|
| `2_smart-edge-nodes-array-performance.json` | 2 (high) | problem | Fix SmartEdge accessing full nodes array causing re-renders |
| `2_extract-shared-edge-label-editor.json` | 2 (high) | improvement | Extract duplicated edge label editing logic into shared component |
| `2_stream-metadata-form-dark-mode.json` | 2 (high) | problem | Fix StreamMetadataForm modal missing all dark mode styles |
| `3_extract-flow-canvas-concerns.json` | 3 (medium) | improvement | Extract FlowCanvasInner sub-concerns into custom hooks |
| `3_stream-stats-panel-dark-mode.json` | 3 (medium) | problem | Fix StreamStatsPanel missing dark mode styles |
| `3_landing-page-create-dialog-accessibility.json` | 3 (medium) | problem | Fix dialog accessibility: missing focus trap and role |

### Overall Assessment

The codebase quality is strong for a hackathon — proper TypeScript, good component decomposition, solid accessibility on core nodes, comprehensive dark mode on the primary canvas path. The main gaps are:

1. **Performance:** SmartEdge subscribes to mutable nodes array — will cause visible lag with 10+ nodes during drag operations.
2. **DRY:** Edge label editing logic is duplicated verbatim across two components.
3. **Dark mode consistency:** Two modals (StreamMetadataForm, StreamStatsPanel) were added without dark mode support — visible regression when toggling theme.
4. **SRP:** FlowCanvasInner accumulates responsibilities as features are added — starting to impede maintainability.
5. **Accessibility:** Dialog patterns incomplete (no focus trap, no aria-modal).

Priority recommendation for demo day: Fix #3 (dark mode) first — it's the most visible regression during a live demo. Then #1 (performance) if canvas feels sluggish. #2 (DRY) improves maintainability for post-hackathon.


## [2026-07-15T08:54] QA Research Run

**App Status:** NOT RUNNING at http://localhost:5173 (ECONNREFUSED). Puppeteer visual testing skipped.

### Existing Task Review

All 52 existing tasks are in "developed" state — the project has progressed significantly since the last QA run. All previously identified issues (dark mode form fields, localStorage error handling, SmartEdge memoization, loading states, hover tooltips, etc.) have been implemented.

### Code Review Findings

1. **React Flow colorMode prop not used (Priority 3)**
   - React Flow v12 (we use ^12.6.0) provides a built-in `colorMode` prop that handles dark mode for all internal elements automatically via CSS variables.
   - The project manually overrides ~40 lines of CSS in `index.css` (`.dark .react-flow__controls`, `.dark .react-flow__background`, `.dark .react-flow__edge-path`, `.dark .react-flow__minimap`) to achieve the same.
   - Using `<ReactFlow colorMode={effectiveTheme} ...>` would simplify maintenance, ensure complete coverage for all internals (including selection rectangles, connection lines), and use the library's native system.
   - **Task created:** `tasks/3_use-reactflow-colormode-prop.json`

2. **Modal dialogs missing ARIA semantics and focus trapping (Priority 3)**
   - `CreateStreamDialog` (landing-page.tsx) and `StreamMetadataForm` (stream-metadata-form.tsx) lack:
     - `role="dialog"` on the modal container
     - `aria-modal="true"` to indicate background is inert
     - `aria-labelledby` pointing to the dialog title
     - Focus trapping (Tab can escape to background elements)
     - Focus restoration on close
   - `guided-demo-panel.tsx` and `keyboard-shortcuts-panel.tsx` have `role="dialog"` but also lack focus trapping and `aria-modal`.
   - This is a WCAG 2.1 SC 4.1.2 failure.
   - **Task created:** `tasks/3_dialog-accessibility-aria-focus-trap.json`

3. **Minor: `bg-gray-50` without dark variant on ReactFlow wrapper** (NOT tasked)
   - `FlowCanvas` has `className="bg-gray-50"` on the ReactFlow component without a `dark:bg-gray-900` variant.
   - In practice this is hidden by the background SVG pattern, but technically incorrect.
   - This would be automatically fixed by adopting the `colorMode` prop (task #1 above).

4. **BrowserRouter vs HashRouter discrepancy** (NOT tasked)
   - The routing task specified HashRouter but BrowserRouter was implemented.
   - BrowserRouter is fine for Vite dev server but would need server-side SPA fallback for static hosting.
   - For hackathon demo purposes, BrowserRouter with Vite's dev server works perfectly. Not an issue.

### Positive Observations

- **All custom components properly memoized:** `SipocNodeComponent`, `SmartEdge`, `LabeledEdge`, `GroupNodeComponent` are all wrapped in `React.memo`.
- **`nodeTypes` and `edgeTypes` defined at module level** — correct per React Flow performance guide.
- **Event listener cleanup is thorough** — all `addEventListener` calls have corresponding `removeEventListener` in cleanup functions.
- **Import validation is robust** — `isValidExportedModel()` properly checks shape of imported JSON files.
- **Safe localStorage adapter implemented** — `safeLocalStorage` wraps all operations in try/catch with user-visible toast notifications.
- **Auto-save debounced at 500ms** — appropriate interval to avoid excessive writes.
- **History/undo debounced at 300ms** — correctly batches rapid changes like node dragging into single undo steps.
- **Cycle detection implemented** — `isValidConnection` prevents users from creating circular dependencies.

### Research Insights

**React Flow v12 Dark Mode (reactflow.dev/examples/styling/dark-mode):**
- Built-in `colorMode` prop accepts 'dark', 'light', or 'system'
- Uses CSS variables internally for all styling
- Automatically themes: edges, controls, minimap, background, selection box, connection lines
- Can coexist with custom Tailwind dark mode on custom node/edge components
- Simply pass the theme store's effective theme value to the prop

**Dialog Accessibility (WAI-ARIA Authoring Practices 1.2):**
- All modal dialogs must have `role="dialog"` and `aria-modal="true"`
- Focus must be trapped within the dialog while open
- First focusable element should receive focus on open
- Escape key should close the dialog
- Focus should return to the trigger element on close
- Background content should be made inert (HTML `inert` attribute or aria-hidden)
- Modern approach: use the native `<dialog>` element with `showModal()` which handles most of these automatically

**Value Stream Mapping Trends (devops.com, projectmanagement.com):**
- VSM is becoming the "connective tissue" between product, engineering, and ops
- Current state vs. future state comparison is increasingly expected
- AI-assisted bottleneck detection is emerging as a differentiator
- Our tool already has CT/LT/VA% metrics which positions it well for analytical VSM

### Tasks Created This Run

| File | Priority | Type | Title |
|------|----------|------|-------|
| `3_use-reactflow-colormode-prop.json` | 3 (medium) | improvement | Use React Flow built-in colorMode prop instead of manual CSS overrides |
| `3_dialog-accessibility-aria-focus-trap.json` | 3 (medium) | improvement | Add proper ARIA dialog semantics and focus trapping to modals |

### Overall Assessment

The codebase is in excellent shape. All 52 previously tracked tasks have been implemented ("developed" state). The remaining improvements are polish-level: adopting React Flow's native dark mode system and improving modal dialog accessibility. No critical bugs found in code review. The app couldn't be tested visually because the dev server is not running — recommend starting `npm run dev` for the next QA cycle to enable Puppeteer-based visual testing.
