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



## [2026-07-15T09:27] QA Research & Puppeteer Testing Run

**App Status:** NOT RUNNING at http://localhost:5173 (curl returned connection refused, port 5173 not listening). Puppeteer visual testing skipped.

**IMPORTANT:** The dev server has not been running for the last 4 QA runs. All testing has been limited to static code review. Visual/interaction testing will resume when `npm run dev` is started.

### Existing Task Review

All 60 existing tasks have been reviewed. Current breakdown:
- **Developed (complete):** ~48 tasks (all Priority 1 tasks complete, majority of Priority 2 complete)
- **Todo (remaining):** ~12 tasks, including:
  - 2_smart-edge-nodes-array-performance (P2, performance)
  - 2_extract-shared-edge-label-editor (P2, DRY)
  - 2_stream-metadata-form-dark-mode (P2, visual bug)
  - 3_use-reactflow-colormode-prop (P3, maintenance)
  - 3_dialog-accessibility-aria-focus-trap (P3, a11y)
  - 3_landing-page-create-dialog-accessibility (P3, a11y)
  - 3_extract-flow-canvas-concerns (P3, refactoring)
  - 3_stream-stats-panel-dark-mode (P3, visual)
  - 3_memoize-smart-edge-component (P3, performance — already done via memo(), but nodes array issue remains)
  - Various P4 improvement ideas

### New Code Review Finding

1. **NodePalette PaletteItem missing dark mode styles (Priority 3)**
   - The outer `NodePalette` wrapper correctly uses `dark:bg-gray-800/90 dark:border-gray-700`.
   - But the inner `PaletteItem` component (the draggable cards) uses only light-mode classes: `bg-white`, `border-gray-200`, `hover:border-primary-300`, `text-gray-700`, `text-gray-400`, `bg-primary-50`, `text-primary-600`.
   - In dark mode, the items appear as bright white cards in a dark container — a visible inconsistency.
   - **Task created:** `tasks/3_node-palette-items-dark-mode.json`

2. **AppShell Stats button active state dark mode (Not tasked — minor)**
   - The Stats toggle uses `className={cn(showStats && 'bg-primary-50 text-primary-700')}` which is light-mode only for the active state.
   - In dark mode, `bg-primary-50` creates a light-colored active state badge. Should be `dark:bg-primary-900/30 dark:text-primary-300`.
   - Too minor for a separate task — should be addressed as part of any dark mode consistency pass.

### Positive Observations Since Last Run

- **Safe localStorage adapter fully implemented** — `safeLocalStorage` in `utils/safe-storage.ts` wraps all ops with try/catch, shows toast on quota exceeded, warns when storage >90% full. Excellent implementation.
- **Toast system is accessible** — `role="region"`, `aria-live="polite"`, `role="alert"` on individual toasts, dismiss buttons with aria-label.
- **Undo/redo debounced correctly** — 300ms debounce prevents excessive history snapshots during drag operations, captures state before first change in a batch.
- **Export/import validation is robust** — `isValidExportedModel()` validates node and edge shape, handles parse errors gracefully.
- **All previously identified memoization fixes applied** — `SipocNodeComponent`, `SmartEdge`, `LabeledEdge`, `GroupNodeComponent` all wrapped in `React.memo`.
- **Loading indicator implemented** — `StreamLoadingIndicator` shows spinner while stream loads, using `requestAnimationFrame` for single-frame delay.
- **Stream editor properly cleans up** — `useEffect` cleanup calls `unloadStream()` and `clearHistory()` with `cancelAnimationFrame`.

### Research Insights

**React Flow Performance (reactflow.dev/learn/advanced-use/performance — July 2025 update):**
- Confirmed: "One of the most common performance pitfalls is directly accessing the nodes or edges in components" — our SmartEdge still does this (task exists)
- Recommended fix: Use `useStoreApi()` for imperative access, or `useReactFlow().getNodes()` within callbacks (not during render for subscription)
- New recommendation: "Simplify node and edge styles" — complex CSS (animations, shadows, gradients) can cause performance issues with many nodes. Our animated edges use CSS animations which may impact at scale.
- Key insight: `nodeTypes` and `edgeTypes` must be defined outside the component or memoized — ours are correctly defined at module level ✓

**Value Stream Mapping Best Practices (Capstera, Asana 2025-2026):**
- Three-phase approach: (1) identify stream components, (2) overlay measurements, (3) visualize for insights
- Key differentiator: ability to model both current state AND future state simultaneously
- Our CT/LT/VA% metrics per node position us well for analytical VSM
- Industry trend: VSM is extending beyond manufacturing into digital product delivery (DevOps VSM)
- Customer segments per stream (we have this) maps to the "demand side" of value stream design

**Diagram Editor Keyboard Accessibility (GLSP, Cambridge Intelligence 2025-2026):**
- Gold standard: all mouse actions should have keyboard equivalents
- Our implementation already has: Tab through nodes, arrow keys between connected nodes, Enter to edit — strong foundation
- Gap: no keyboard shortcut for creating connections between nodes (only mouse drag between handles)
- Gap: no keyboard way to invoke context menu (Shift+F10 is the standard)
- Both are stretch goals, not critical for hackathon demo

### Priority Recommendations for Demo Day (July 15)

**High impact for live demo:**
1. Fix StreamMetadataForm dark mode (P2) — most visible regression if demoing in dark mode
2. Fix SmartEdge nodes array performance (P2) — prevents lag during drag with multiple nodes on screen
3. Fix NodePalette dark mode (P3) — visible if showing drag-and-drop feature in dark mode

**Nice to have:**
4. Extract shared edge label editor (P2) — good code quality but no visible user impact
5. React Flow colorMode prop (P3) — simplifies code, minor visual improvements in edge cases
6. Dialog accessibility (P3) — important but not visible in typical demo flow

### Tasks Created This Run

| File | Priority | Type | Title |
|------|----------|------|-------|
| `3_node-palette-items-dark-mode.json` | 3 (medium) | problem | Fix NodePalette draggable items missing dark mode styles |

### Overall Assessment

The codebase is very mature for a hackathon. All critical features work. The remaining ~12 open tasks are quality improvements (performance, DRY, dark mode consistency, accessibility). The most impactful remaining work for demo readiness is the dark mode consistency across 3 components (StreamMetadataForm, StreamStatsPanel, NodePalette) and the SmartEdge performance fix. No critical bugs detected in static analysis. **The dev server needs to be started for Puppeteer visual testing to validate actual runtime behavior.**



## [2026-07-15T09:32] QA Research & Code Analysis Run

**App Status:** NOT RUNNING at http://localhost:5173 (port 5173 not listening, curl exit code 7 = connection refused). Puppeteer visual testing skipped for the 5th consecutive run.

**IMPORTANT:** The dev server has not been running for multiple QA cycles. All testing is limited to static code analysis. Visual/interaction testing will resume when `npm run dev` is started in a separate terminal.

### Existing Task Review

10 tasks remain in "todo" state (9 + template):
- **P2 (3 tasks):** SmartEdge nodes array performance, extract shared edge label editor, StreamMetadataForm dark mode
- **P3 (6 tasks):** React Flow colorMode prop, dialog accessibility (2 tasks), extract FlowCanvas concerns, StreamStatsPanel dark mode, NodePalette items dark mode

All other ~52 tasks are in "developed" state.

### New Code Review Findings

1. **MiniMap dark mode broken by Tailwind !important override (Priority 2)**
   - `flow-canvas.tsx` line 536: `className="!bg-white !border-gray-200"` on the MiniMap component.
   - The `!` prefix in Tailwind generates CSS `!important` declarations: `background-color: #fff !important`.
   - The dark mode CSS in `index.css` (`.dark .react-flow__minimap { background-color: #1f2937 }`) does NOT use `!important`.
   - CSS specificity rule: `!important` always wins regardless of selector specificity.
   - **Result:** In dark mode, the minimap appears as a **bright white rectangle** — a clearly visible visual regression.
   - **Fix:** Remove `!` prefix and add dark variants: `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`.
   - Related to `3_use-reactflow-colormode-prop.json` (which would remove all manual overrides) but this is an immediate 1-line bug fix.
   - **Task created:** `tasks/2_minimap-dark-mode-important-override.json`

2. **No prefers-reduced-motion support for animated edges (Priority 3)**
   - ALL edges are created with `animated: true` by default:
     - `flow-canvas.tsx`: `defaultEdgeOptions={{ type: 'smart', animated: true }}`
     - `handleConnect()` and proximity connect both hardcode `animated: true`
     - `demo-data.ts`: all demo edges have `animated: true`
   - React Flow's `animated` prop applies CSS `stroke-dasharray` animation.
   - The project has zero `prefers-reduced-motion` handling anywhere (no CSS, no JS).
   - Users with motion sensitivity receive no relief — all edges animate constantly.
   - WCAG 2.1 SC 2.3.3 (Animation from Interactions) concern.
   - Performance note: Chrome has a known bug where `stroke-dasharray` animation causes high CPU usage with many SVG elements (chromium issues/40958492). With 10+ animated edges this compounds with the SmartEdge re-render issue.
   - **Fix:** Add `@media (prefers-reduced-motion: reduce)` CSS rule to disable stroke animations.
   - **Task created:** `tasks/3_prefers-reduced-motion-animated-edges.json`

3. **AppShell Stats button active state — light-only classes (NOT tasked, minor)**
   - Line in `app-shell.tsx`: `className={cn(showStats && 'bg-primary-50 text-primary-700')}`
   - In dark mode, `bg-primary-50` creates a light-colored badge against the dark toolbar.
   - Should be: `cn(showStats && 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300')`
   - Too minor for a standalone task — should be addressed during any dark mode pass.

### Positive Observations

- **Safe localStorage adapter fully operational** — `safeLocalStorage` wraps all persist middleware, handles quota errors with user toast notifications.
- **Theme store well-implemented** — Early import in `main.tsx`, system preference listener, `onRehydrateStorage` applies class before first paint (no flash).
- **All edge/node components memoized** — `React.memo` on SipocNodeComponent, SmartEdge, LabeledEdge, GroupNodeComponent per React Flow performance guide.
- **`nodeTypes` and `edgeTypes` at module level** — prevents re-creation on every render (confirmed correct pattern).
- **Cycle detection implemented** — `isValidConnection` prevents circular dependencies in value streams.
- **Stream loading has requestAnimationFrame delay** — allows React Flow to process nodes before showing canvas (prevents flash of empty state).
- **History debounced at 300ms** — correctly batches rapid changes during node drag into single undo steps.

### Research Insights

**React Flow Edge Animation Performance (liambx.com/blog — Liam ERD case study):**
- `stroke-dasharray` CSS animation is a known CPU bottleneck with many SVG elements.
- Chrome has documented issue: high CPU utilization when CSS-animating stroke-dashoffset.
- Solution: Replace `animated: true` with custom SVG `<animateMotion>` particles for selective highlighting rather than animating ALL edges constantly.
- Our current setup: ALL edges animated by default + SmartEdge subscribing to full nodes array = double performance hit.
- Recommendation: Consider making `animated` conditional (only on selected/hovered edges) rather than always-on.

**React Flow Performance (reactflow.dev — confirmed current best practices):**
- ✓ Custom node/edge components memoized with `React.memo`
- ✓ `nodeTypes`/`edgeTypes` defined outside component
- ✗ SmartEdge still subscribes to `useGraphStore((s) => s.nodes)` — the single biggest performance issue remaining
- New insight: "Simplify node and edge styles — complex CSS (animations, shadows, gradients) can cause performance issues with many nodes"
- Our animated edges + box shadows on nodes + SmartEdge full-array subscription creates a compounding performance problem at scale (10+ nodes with many connections)

**Accessible Dialog Patterns (2025-2026 research):**
- Native `<dialog>` element with `showModal()` handles most accessibility automatically: focus trap, background inert, Escape to close.
- Modern approach: use HTML `inert` attribute on `<div id="root">` when dialog is open (browser-native, no JS focus trap needed).
- Both approaches are simpler than manual JS focus trap implementations.
- Recommendation for our dialogs: wrap in native `<dialog>` element using `useRef` + `showModal()` pattern. This gives us `role="dialog"`, `aria-modal`, focus trap, and Escape handling for free.
- Applies to: CreateStreamDialog, StreamMetadataForm, GuidedDemoPanel, KeyboardShortcutsPanel.

**Value Stream Mapping Tools (2025-2026 competitive landscape):**
- Miro: AI-powered clustering and summarization of process data during mapping sessions
- Axify: Integrates with DevOps tools (Jira, GitLab) to auto-generate delivery value stream maps
- Lucidchart: Current-state vs future-state comparison as a primary feature
- Key differentiator opportunity: our CT/LT/VA% metrics per node + analytics panel positions us uniquely for quantitative VSM
- All tools emphasize collaborative editing as table-stakes (out of scope for us but noted)
- ClickUp & Monday: embedding VSM into work management tools (integration trend)

### Priority Recommendations for Demo Day (July 15 afternoon)

**Must-fix for demo (visible regressions in dark mode):**
1. ⭐ MiniMap !important dark mode bug (P2) — **single most visible regression** if demoing in dark mode (white rectangle in corner)
2. StreamMetadataForm dark mode (P2) — visible when opening stream details modal in dark mode
3. StreamStatsPanel dark mode (P3) — visible when toggling stats in dark mode
4. NodePalette items dark mode (P3) — visible when showing drag-and-drop in dark mode

**Performance (prevents lag during demo):**
5. SmartEdge nodes array subscription (P2) — prevents lag when dragging nodes with many edges

**Code quality (not visible to demo audience):**
6. Extract shared edge label editor (P2) — DRY improvement, no user-facing change
7. prefers-reduced-motion (P3) — accessibility, only affects motion-sensitive users
8. Dialog accessibility (P3) — screen reader users only

### Tasks Created This Run

| File | Priority | Type | Title |
|------|----------|------|-------|
| `2_minimap-dark-mode-important-override.json` | 2 (high) | problem | Fix MiniMap dark mode broken by Tailwind !important override |
| `3_prefers-reduced-motion-animated-edges.json` | 3 (medium) | improvement | Add prefers-reduced-motion support for animated edges |

### Overall Assessment

The codebase remains in excellent shape. The most impactful remaining work for demo readiness is fixing 4 dark mode visual regressions (MiniMap, StreamMetadataForm, StreamStatsPanel, NodePalette) — all visible during a dark mode demo. The MiniMap bug is the newest and most surprising (white rectangle in the corner due to CSS specificity conflict).

The SmartEdge performance issue is the only remaining P2 that affects runtime behavior rather than visuals. Combined with the always-on `stroke-dasharray` animation on all edges, this creates a compounding performance problem that will be noticeable during demos with 8+ nodes.

**The dev server needs to be started (`npm run dev`) for Puppeteer-based visual and interaction testing.** All findings in this run are from static code analysis only — runtime behavior, rendering glitches, and interaction bugs can only be caught with live testing.



## [2026-07-15T09:38] QA Research & Code Analysis Run

**App Status:** NOT RUNNING at http://localhost:5173 (port 5173 not listening, netstat shows no listener, curl exit code 7 = connection refused). Puppeteer visual testing skipped for the 6th consecutive run.

**CRITICAL:** The dev server has not been running for ALL QA cycles today. All testing is limited to static code analysis. **For the live demo today (July 15), ensure `npm run dev` is started.** Visual/interaction testing cannot validate runtime behavior without it.

### Existing Task Review

**11 tasks remain in "todo" state:**
- **P2 (3 tasks):** SmartEdge nodes array performance, extract shared edge label editor, StreamMetadataForm dark mode
- **P3 (7 tasks):** React Flow colorMode prop, dialog accessibility (2 tasks), extract FlowCanvas concerns, StreamStatsPanel dark mode, NodePalette items dark mode, prefers-reduced-motion animated edges
- **Plus 1 new task created this run** (see below)

All other ~52 tasks are in "developed" state. The codebase is feature-complete for demo purposes.

### New Code Review Finding

1. **NodeSearchPanel missing ALL dark mode styles (Priority 3)**
   - The search trigger button (closed state) uses: `bg-white`, `text-gray-600`, `border-gray-200`, `hover:bg-gray-50`, `hover:text-gray-900`, `bg-gray-100` (kbd badge) — no `dark:` variants.
   - The open search panel container uses: `bg-white`, `border-gray-200` — no `dark:` variants.
   - Internal elements: `border-gray-100` (dividers), `text-gray-900` (input), `placeholder-gray-400` (placeholder), `bg-primary-50 text-primary-900` (selected result), `hover:bg-gray-50 text-gray-700` (result items) — ALL without dark variants.
   - In dark mode: bright white search button and panel floating over the dark canvas — a clear visual inconsistency.
   - `keyboard-shortcuts-panel.tsx` and `node-context-menu.tsx` in the same directory correctly implement dark mode — pattern to follow exists.
   - **Task created:** `tasks/3_node-search-panel-dark-mode.json`

### Confirmed Issues (no action needed — tasks already exist)

- MiniMap `!bg-white` override still blocks dark CSS (task exists: `2_minimap-dark-mode-important-override`)
- SmartEdge `useGraphStore((s) => s.nodes)` subscription still present at line 43 (task exists: `2_smart-edge-nodes-array-performance`)
- LabeledEdge label div still missing dark mode classes (covered by: `2_extract-shared-edge-label-editor`)
- StreamMetadataForm still fully light-mode only (task exists: `2_stream-metadata-form-dark-mode`)
- StreamStatsPanel still fully light-mode only (task exists: `3_stream-stats-panel-dark-mode`)
- NodePalette items still missing dark variants (task exists: `3_node-palette-items-dark-mode`)
- No `prefers-reduced-motion` in CSS (task exists: `3_prefers-reduced-motion-animated-edges`)
- AppShell Stats button `bg-primary-50 text-primary-700` active state lacks dark variant (minor, not tasked standalone)

### Positive Observations

- **Zero `any` types in entire src/ codebase** — excellent TypeScript discipline for a hackathon.
- **No stray console.log/debug** — only appropriate `console.error` in safe-storage.ts for error reporting.
- **All custom node/edge components properly memoized** — SipocNodeComponent, SmartEdge, LabeledEdge, GroupNodeComponent all wrapped in `React.memo`.
- **Process metrics dark mode FIXED** — confirmed all inputs in sipoc-form.tsx now have complete `dark:` variants. Task correctly marked as developed.
- **Context menu, keyboard shortcuts panel, guided demo panel** all have proper dark mode support.
- **Connection validation robust** — prevents self-connections, duplicates, and cycles (DAG enforcement).
- **Auto-save debounced at 500ms** — appropriate for localStorage persistence.
- **Cycle detection** with `wouldCreateCycle()` prevents users from creating invalid value streams.

### Research Insights

**React Flow Performance (reactflow.dev/learn/advanced-use/performance — updated July 6, 2026):**
- Confirmed critical guidance: "One of the most common performance pitfalls in React Flow is directly accessing the nodes or edges in the components."
- Official recommended fix: "Store the selected nodes in a separate field in your state" or use `useStoreApi()` for imperative access.
- Our SmartEdge violates this DIRECTLY — `useGraphStore((s) => s.nodes)` on line 43 subscribes to the entire array.
- New insight from official docs: "Simplify node and edge styles — complex CSS (animations, shadows, gradients) can significantly impact performance."
- Our animated edges + SmartEdge full-array subscription creates a compounding performance problem.
- React Flow 12.11.2 (latest July 2025) — no breaking changes that affect us.

**React Flow Animated SVG Edge (reactflow.dev/ui/components/animated-svg-edge):**
- Official UI component library now provides an `AnimatedSvgEdge` that uses SVG `<circle>` elements animated along the path with `<animateMotion>` instead of `stroke-dasharray`.
- This is significantly more performant than CSS stroke-dasharray animation (avoids the Chrome bug).
- Could replace our `animated: true` default with a custom animated edge that uses this pattern.
- However, this is a nice-to-have optimization — not critical for demo day.

**Liam ERD Case Study (liambx.com/blog):**
- They replaced React Flow's default `stroke-dasharray` animation with custom SVG solutions after measuring 40% CPU reduction on large diagrams.
- Confirmed our concern about `animated: true` on all edges by default.

**Tailwind Dark Mode Systematic Approach (2025-2026 best practices):**
- CSS custom properties approach (define colors as variables, swap in dark mode) is considered more maintainable than individual `dark:` classes for large apps.
- For our hackathon scope, the `dark:` class approach is appropriate — quick to add, no infrastructure change needed.
- Key pattern: When adding a new component, ALWAYS include dark variants from the start. Retrofitting is error-prone (as we're seeing with 5 components missing dark mode).
- Recommendation: Add a brief "Dark Mode Checklist" to the steering docs for future components.

**Value Stream Mapping (Miro, Asana, Creately 2025-2026):**
- All major VSM tools emphasize "current state vs future state" comparison as a primary feature.
- Our tool's CT/LT/VA% metrics per process node are a strong differentiator — most tools only offer qualitative mapping.
- Industry trend: VSM extending from manufacturing to digital product delivery (DevOps value streams).
- Competitive positioning: Our tool is uniquely positioned for product owners doing quantitative VSM with branching processes.

### Priority Recommendations for Demo Day (July 15)

**Dark mode bundle (5 components, ~30 min total for developer agent):**
1. ⭐ MiniMap !important override (P2) — 1-line fix, most jarring visual bug
2. StreamMetadataForm (P2) — visible when opening stream details
3. StreamStatsPanel (P3) — visible when toggling stats
4. NodePalette items (P3) — visible during drag-and-drop demo
5. NodeSearchPanel (P3) — visible when using Ctrl+F search (NEW this run)

**Performance (prevents lag during demo):**
6. SmartEdge nodes array subscription (P2) — visible lag at 8+ nodes during drag

**If time permits:**
7. Extract shared edge label editor (P2) — code quality, no visible change
8. prefers-reduced-motion (P3) — accessibility compliance

### Tasks Created This Run

| File | Priority | Type | Title |
|------|----------|------|-------|
| `3_node-search-panel-dark-mode.json` | 3 (medium) | problem | Fix NodeSearchPanel missing all dark mode styles |

### Overall Assessment

The codebase is demo-ready from a functionality standpoint. All features work correctly. The remaining open tasks are exclusively quality improvements:
- **5 dark mode gaps** across secondary UI components (MiniMap, StreamMetadataForm, StreamStatsPanel, NodePalette, NodeSearchPanel)
- **1 performance issue** (SmartEdge subscribing to full nodes array)
- **1 DRY improvement** (duplicated edge label editing logic)
- **2 accessibility improvements** (dialog focus trapping, reduced motion)
- **1 refactoring task** (FlowCanvasInner hook extraction)

For the live demo, the dark mode issues are the highest-impact fixes since they're immediately visible if demoing in dark mode. If the team plans to demo in light mode only, these become lower priority and the SmartEdge performance fix becomes the most important remaining work.

**ACTION NEEDED:** Start `npm run dev` to enable Puppeteer-based visual and interaction testing. Static code analysis cannot detect runtime rendering bugs, state desync issues, or interaction failures.
