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
