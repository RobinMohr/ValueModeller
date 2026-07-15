# Research: Coding Guidelines & Standard Practices for Value Modeller

**Last Updated:** 2026-07-15T12:34:35+02:00

---

## Summary

This document collects coding guidelines, best practices, and standard patterns relevant to the Value Modeller repository. Research is organized by the key technologies in the stack: React Flow, Zustand, Vitest/React Testing Library, Tailwind CSS dark mode, TypeScript, React Router v7, accessibility (WCAG), Vite build optimization, dagre auto-layout, custom hooks patterns, and component composition. Findings are prioritized by relevance to current and future tasks in the project.

---

## 1. React Flow (@xyflow/react) — Performance & Patterns

**Relevance: HIGH** — Core rendering library; multiple tasks involve edge memoization, smart routing, node grouping

### Key Guidelines (from official docs — updated July 6, 2026)

| Practice | Why |
|----------|-----|
| **Memoize all custom node and edge components** with `React.memo` | Prevents re-renders during drag/pan/zoom |
| **Memoize all handler functions** with `useCallback` | Avoids new function references on every render |
| **Memoize arrays/objects** (`defaultEdgeOptions`, `snapGrid`) with `useMemo` | Prevents unnecessary re-renders from reference changes |
| **Avoid accessing the full `nodes` array** inside custom node/edge components | The `nodes` array changes on every drag; accessing it causes all nodes/edges to re-render |
| **Use `useNodesData` hook** for targeted data access | Only triggers re-render when specific node data changes |
| **Use `useStoreApi()` for imperative access** | Access nodes without subscribing — no re-renders |
| **Collapse hidden nodes** for large trees | Use `hidden` property to toggle visibility dynamically |
| **Simplify CSS on nodes** — avoid animations, shadows, gradients at scale | Complex CSS can bottleneck rendering with many nodes |

### Avoiding Node Subscription in Custom Edges (Critical for SmartEdge)

The official performance guide states: "One of the most common performance pitfalls in React Flow is directly accessing the nodes or edges in the components."

**Anti-pattern:**
```typescript
// ❌ Subscribes to ALL node changes — re-renders on every drag
const nodes = useGraphStore((s) => s.nodes);
```

**Correct pattern — use `useReactFlow()` for imperative access:**
```typescript
// ✅ No subscription — access nodes only at render time
const { getNodes } = useReactFlow();
const nodes = getNodes(); // Reads current value without subscribing
```

**Alternative — use `useStoreApi()` for callback-only access:**
```typescript
// ✅ No subscription — access nodes only when needed (e.g., in callbacks)
const store = useStoreApi();

const computePath = useCallback(() => {
  const { nodes } = store.getState();
  // ... compute path using nodes
}, [store]);
```

### State Management Pattern with Zustand (React Flow recommended)

```typescript
interface FlowStore {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
}
```

Important: When updating node data, always create a new object reference:
```typescript
return { ...node, data: { ...node.data, ...newData } };
```

### React Flow colorMode Prop (v12+)

React Flow v12 provides a built-in `colorMode` prop that handles dark mode for all internal elements automatically via CSS variables:

```tsx
<ReactFlow colorMode={isDark ? 'dark' : 'light'} ... />
```

This automatically themes: edges, controls, minimap, background, selection box, connection lines. The implementation adds a "dark" class to the wrapper and switches CSS variables.

### Context Menu Pattern (from official example)

```tsx
const onNodeContextMenu = useCallback(
  (event, node) => {
    event.preventDefault();
    const pane = ref.current.getBoundingClientRect();
    setMenu({
      id: node.id,
      top: event.clientY < pane.height - 200 && event.clientY,
      left: event.clientX < pane.width - 200 && event.clientX,
      right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
      bottom: event.clientY >= pane.height - 200 && pane.height - event.clientY,
    });
  },
  [setMenu],
);

const onPaneClick = useCallback(() => setMenu(null), [setMenu]);
```

### Drag and Drop from Sidebar (Official Pattern)

```tsx
// In the sidebar — set drag data
const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData('text/plain', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

// In the ReactFlow wrapper — handle drops
const onDrop = useCallback((event) => {
  event.preventDefault();
  const type = event.dataTransfer.getData('text/plain');
  if (!type) return;

  const position = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });

  const newNode = { id: generateId(), type, position, data: { label: `${type} node` } };
  setNodes((nds) => nds.concat(newNode));
}, [screenToFlowPosition]);
```

Key notes:
- Use `screenToFlowPosition()` (replaces old `project()` method in v12)
- HTML Drag and Drop API does NOT work well on touch devices

### Sub-Flows & Node Grouping Pattern

```typescript
const groupNode = {
  id: 'group-1',
  type: 'group',
  position: { x: 0, y: 0 },
  style: { width: 400, height: 300 },
  data: { label: 'Department A' },
};

const childNode = {
  id: 'child-1',
  type: 'sipocNode',
  parentId: 'group-1',
  extent: 'parent',
  position: { x: 20, y: 40 }, // Relative to parent top-left
  data: { ... },
};
```

**Critical rules:**
1. Parent nodes MUST appear before their children in the `nodes` array
2. Child `position` is relative to parent's top-left corner
3. `extent: 'parent'` prevents dragging child outside parent
4. Moving the parent moves all children automatically

### Testing React Flow Components

```typescript
// Mock ResizeObserver and DOMMatrixReadOnly for jsdom
class ResizeObserver {
  callback: globalThis.ResizeObserverCallback;
  constructor(callback: globalThis.ResizeObserverCallback) { this.callback = callback; }
  observe(target: Element) {
    setTimeout(() => { this.callback([{ target } as any], this); }, 0);
  }
  unobserve() {}
  disconnect() {}
}

export const mockReactFlow = () => {
  global.ResizeObserver = ResizeObserver;
  Object.defineProperties(global.HTMLElement.prototype, {
    offsetHeight: { get() { return parseFloat(this.style.height) || 1; } },
    offsetWidth: { get() { return parseFloat(this.style.width) || 1; } },
  });
};
```

Use `waitFor` for edges (render asynchronously after node measurement).

### Accessibility in React Flow (v12+)

- Built-in keyboard controls: Enter/Space to select, arrow keys to move, Delete to remove
- `colorMode` prop handles internal dark/light styling automatically
- Custom nodes should include proper ARIA attributes for interactive elements

**Sources:**
- https://reactflow.dev/learn/advanced-use/performance (Relevance: HIGH)
- https://reactflow.dev/learn/advanced-use/state-management (Relevance: HIGH)
- https://reactflow.dev/api-reference/hooks/use-store-api (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/context-menu (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/drag-and-drop (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/copy-paste (Relevance: HIGH)
- https://reactflow.dev/learn/layouting/sub-flows (Relevance: HIGH)
- https://reactflow.dev/learn/advanced-use/testing (Relevance: HIGH)
- https://reactflow.dev/examples/styling/dark-mode (Relevance: HIGH)

---

## 2. Dagre Auto-Layout — Best Practices

**Relevance: HIGH** — Project uses `@dagrejs/dagre` for auto-layout; relevant for value stream visualization

### Dagre Integration Pattern (Official React Flow)

```typescript
import dagre from '@dagrejs/dagre';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};
```

### Key Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `rankdir` | Layout direction: `TB`, `BT`, `LR`, `RL` | `TB` |
| `nodesep` | Horizontal separation between nodes | 50 |
| `ranksep` | Vertical separation between ranks | 50 |
| `edgesep` | Separation between edges | 10 |
| `align` | Node alignment: `UL`, `UR`, `DL`, `DR` | undefined |

### Best Practices for This Project

1. **Use actual node dimensions** — don't hardcode width/height; measure rendered nodes for accurate layout
2. **Reset the graph** before each layout computation (dagre is stateful)
3. **Handle sub-flows separately** — dagre has an open issue with nodes connected across sub-flow boundaries
4. **Pause undo history** during auto-layout — it's a single user action, not individual node moves
5. **Use `fitView()` after layout** — ensures all repositioned nodes are visible
6. **Consider ELK.js for complex cases** — if you need edge routing + layout together, ELK handles both

**Sources:**
- https://reactflow.dev/learn/layouting/layouting (Relevance: HIGH)
- https://reactflow.dev/examples/layout/dagre (Relevance: HIGH)
- https://github.com/dagrejs/dagre/wiki#configuring-the-layout (Relevance: HIGH)

---


## 3. Zustand State Management — Best Practices

**Relevance: HIGH** — Primary state management; persist middleware, store testing, and performance are all active concerns

### Store Design Patterns

| Pattern | Description |
|---------|-------------|
| **One store per domain** | Separate graph state from UI state from value-stream state (already followed) |
| **`subscribeWithSelector` middleware** | Prevents full-store re-renders; enables granular subscriptions |
| **`partialize` in persist** | Only persist what's necessary — skip derived state, UI state |
| **Custom storage adapters** | For robust error handling around localStorage limitations |
| **Debounced auto-save** | The 500ms debounce pattern used in graph-store is appropriate |

### Persist Middleware — Robust Error Handling

```typescript
const safeStorage: StateStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name); }
    catch (e) { console.error('Storage read error:', e); return null; }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value); }
    catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded');
        // Show user-facing notification
      }
    }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name); }
    catch (e) { console.error('Storage remove error:', e); }
  },
};
```

**localStorage limits:**
- 5 MiB per origin (most browsers)
- Always wrap `setItem()` in try/catch
- Show user-facing notifications when storage fails
- Consider IndexedDB if data grows beyond localStorage limits

### Testing Zustand Stores (Official Guide)

The official Zustand docs recommend resetting stores between tests to prevent state leaking:

```typescript
// src/test/zustand-setup.ts — for Vitest
import { act } from '@testing-library/react';

const storeResetFns = new Set<() => void>();

// When creating stores, register their reset function
export const registerStoreReset = (resetFn: () => void) => {
  storeResetFns.add(resetFn);
};

// Reset all stores between tests
beforeEach(async () => {
  await act(() => {
    storeResetFns.forEach((resetFn) => resetFn());
  });
});
```

**Key patterns for testing stores:**
- Test store actions by calling them directly via `store.getState().actionName()`
- Verify state changes with `store.getState()` after action calls
- For components consuming stores, render the component and test behavior (not store internals)
- Use `renderHook` to test custom hooks that wrap store selectors
- Mock the store module for component tests where you need controlled state

**Sources:**
- https://zustand.docs.pmnd.rs/learn/guides/testing (Relevance: HIGH)
- https://github.com/pmndrs/zustand/discussions/1961 (Relevance: MEDIUM)

---

## 4. Zundo — Undo/Redo Middleware for Zustand

**Relevance: HIGH** — Project has undo/redo task; `zundo` is the standard solution for Zustand stores (<700 bytes)

### Basic Setup

```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

interface StoreState {
  nodes: Node[];
  edges: Edge[];
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
}

const useGraphStore = create<StoreState>()(
  temporal(
    (set) => ({
      nodes: [],
      edges: [],
      addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
      removeNode: (id) => set((s) => ({ nodes: s.nodes.filter(n => n.id !== id) })),
    }),
    {
      // Only track nodes and edges, not UI state or actions
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      // Limit history to prevent memory bloat
      limit: 50,
      // Debounce rapid changes (e.g., dragging)
      handleSet: (handleSet) =>
        throttle<typeof handleSet>((state) => {
          handleSet(state);
        }, 1000),
    },
  ),
);
```

### Accessing Undo/Redo

```typescript
// Non-reactive access (for buttons)
const { undo, redo, clear } = useGraphStore.temporal.getState();

// Reactive access (for disabling buttons when no history)
import { useStoreWithEqualityFn } from 'zustand/traditional';

function useTemporalStore<T>(selector: (state: TemporalState) => T) {
  return useStoreWithEqualityFn(useGraphStore.temporal, selector);
}

// In component:
const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
const canRedo = useTemporalStore((s) => s.futureStates.length > 0);
```

### Key Configuration Options

| Option | Description |
|--------|-------------|
| `partialize` | Only track specific fields (exclude actions, UI state) |
| `limit` | Max number of history states (prevents memory issues) |
| `equality` | Custom function to prevent storing unchanged states |
| `handleSet` | Wrap with throttle/debounce for rapid changes |
| `diff` | Store only deltas instead of full state snapshots |
| `onSave` | Callback when temporal store is updated |

### Pause/Resume Tracking

```typescript
const { pause, resume, isTracking } = useGraphStore.temporal.getState();

// Pause during auto-layout (single action, not individual moves)
pause();
performAutoLayout();
resume();
```

### Integration with Persist Middleware

```typescript
import { persist } from 'zustand/middleware';

const useStore = create<StoreState>()(
  persist(
    temporal(
      (set) => ({ /* store fields */ }),
      { partialize: (state) => ({ nodes: state.nodes, edges: state.edges }) },
    ),
    { name: 'graph-store' },
  ),
);
```

**Sources:**
- https://github.com/charkour/zundo (Relevance: HIGH)
- https://www.npmjs.com/package/zundo (Relevance: HIGH)

---


## 5. Vitest + React Testing Library — Best Practices

**Relevance: HIGH** — Multiple tasks require unit tests for both the value modeller frontend and TecFactory backend

### Project Setup (Already Configured)

The project already has Vitest configured via `package.json` scripts:
- `npm test` — run all tests once
- `npm run test:watch` — watch mode
- `npm run test:coverage` — coverage report

Test files live in `src/tests/` with `.test.ts` extension.

### Vitest Configuration for React

```typescript
// vite.config.ts — add test configuration
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/', '**/*.d.ts'],
    },
  },
});
```

### Test Setup File

```typescript
// src/tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.matchMedia (needed for dark mode / responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (needed for React Flow)
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});
```

### Query Priority (Accessibility-First)

Use queries in this order — prefer accessible queries that match how users find elements:

1. **`getByRole`** — Best for accessibility (buttons, headings, dialogs)
2. **`getByLabelText`** — Great for form elements
3. **`getByPlaceholderText`** — For inputs with placeholders
4. **`getByText`** — For non-interactive display elements
5. **`getByDisplayValue`** — For filled-in form elements
6. **`getByTestId`** — Last resort when other queries don't work

### User Event over fireEvent

```typescript
// ✅ Prefer userEvent — simulates real user interactions
import userEvent from '@testing-library/user-event';

it('handles click', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick} />);
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});

// ❌ Avoid fireEvent — low-level, doesn't simulate full interaction
fireEvent.click(button); // Misses focus, pointer events, etc.
```

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';

describe('useCounter', () => {
  it('increments the counter', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => { result.current.increment(); });
    
    expect(result.current.count).toBe(1);
  });
});
```

### Testing Components with Router

```typescript
import { MemoryRouter } from 'react-router-dom';

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

it('renders dashboard at /streams/:id', () => {
  renderWithRouter(<App />, { route: '/streams/abc123' });
  expect(screen.getByText(/canvas/i)).toBeInTheDocument();
});
```

### Testing Async Operations

```typescript
it('displays data after loading', async () => {
  render(<AsyncComponent />);
  
  // Use findBy* (combines getBy + waitFor)
  expect(await screen.findByText('Data loaded')).toBeInTheDocument();
});

// Or explicit waitFor
await waitFor(() => {
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

### Mocking Patterns

```typescript
// Mock a module
vi.mock('../utils/export-import', () => ({
  exportModel: vi.fn(),
  importModel: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
}));

// Mock timers
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

// Spy on console
vi.spyOn(console, 'error').mockImplementation(() => {});
```

### Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Testing implementation details | Test behavior (what user sees), not internal state |
| Not waiting for async | Use `findBy*` or `waitFor` for async content |
| Over-mocking | Only mock external services/APIs, not internal logic |
| Snapshot abuse | Use sparingly; prefer explicit assertions |
| Not cleaning up | Vitest + RTL auto-cleanup; but reset mocks with `afterEach` |

**Sources:**
- https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view (Relevance: HIGH)
- https://vitest.dev/guide/browser/component-testing (Relevance: MEDIUM)
- https://testing-library.com/docs/react-testing-library/cheatsheet/ (Relevance: HIGH)
- https://kentcdodds.com/blog/common-mistakes-with-react-testing-library (Relevance: HIGH)

---


## 6. Tailwind CSS Dark Mode — Architecture & Patterns

**Relevance: HIGH** — Multiple tasks fix dark mode inconsistencies; project uses class-based dark mode toggle with localStorage persistence

### Architecture (Three Pieces)

1. **CSS Variables** — Define a palette in `:root` and override in `.dark`. Every color should be a variable, not a hardcoded hex.
2. **Class Toggle** — Add/remove `dark` class on `<html>`. Tailwind detects this automatically.
3. **Init Script** — Read stored preference (or system preference) and set class BEFORE paint to avoid flash.

### Current Project Pattern

The project uses `darkMode: 'class'` strategy in `tailwind.config.js` with a `theme-store.ts` that persists the user's choice to localStorage and applies/removes the `dark` class on `document.documentElement`.

### The Four Common Mistakes

| Mistake | Cause | Fix |
|---------|-------|-----|
| **Hardcoded colors** | `bg-white`, `text-gray-900` without `dark:` variant | Always pair with `dark:bg-gray-800 dark:text-gray-100` |
| **Theme flash** | JS sets class after paint | Run detection script synchronously in `<head>` |
| **Broken images/icons** | Logos with white backgrounds | Provide dark variants or use `dark:invert` |
| **Toggle without persistence** | Resets on reload | Store in localStorage, read in init script |

### Checklist for Every Component

1. All `bg-*` classes need a `dark:bg-*` counterpart
2. All `text-*` classes need `dark:text-*`
3. All `border-*` classes need `dark:border-*`
4. Focus rings: `focus:ring-blue-500 dark:focus:ring-blue-400`
5. Form inputs: `dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`
6. Headings and labels: `dark:text-gray-200` or `dark:text-gray-300`
7. Disabled states: `dark:text-gray-500 dark:bg-gray-800`
8. Shadows: `shadow-lg dark:shadow-gray-900/50`

### Testing Dark Mode (6-Step Protocol)

1. Toggle twice — check no flash
2. Reload on dark — confirm persistence
3. Open every modal/dropdown/overlay — check colors apply inside
4. Check all form states (focus, disabled) — verify visibility
5. Inspect charts, images, icons — check they don't invert poorly
6. Run contrast tool (axe DevTools) — verify WCAG AA on every text

### React Flow + Dark Mode

React Flow v12 provides a built-in `colorMode` prop:

```tsx
<ReactFlow colorMode={isDark ? 'dark' : 'light'} ... />
```

This automatically themes edges, controls, minimap, background, selection box, and connection lines via CSS variables. Do NOT manually override these with Tailwind `!important` — it breaks the minimap (see task `2_33d0241e`).

**Sources:**
- https://blog.vibecoder.me/dark-mode-implementation-web-app (Relevance: HIGH)
- https://tailwindcss.com/docs/dark-mode (Relevance: HIGH)
- https://reactflow.dev/examples/styling/dark-mode (Relevance: HIGH)

---


## 7. Accessibility — Focus Traps, ARIA Dialogs, Keyboard Navigation

**Relevance: HIGH** — Multiple tasks: focus trapping in dialogs, ARIA dialog semantics, keyboard navigation between nodes

### WCAG Standards for Modals/Panels

| Criterion | Requirement |
|-----------|-------------|
| 2.1.1 Keyboard | All modal functionality operable via keyboard alone |
| 2.1.2 No Keyboard Trap | Users must exit via Escape key or close button |
| 2.4.3 Focus Order | Focus sequence inside modal must be logical |
| 4.1.2 Name, Role, Value | Modal exposes role and state via ARIA |

### Required ARIA Attributes for Dialogs

```html
<div role="dialog" aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-desc">
  <h2 id="modal-title">Title</h2>
  <p id="modal-desc">Description</p>
  <!-- ... content ... -->
</div>
```

- Use `role="alertdialog"` for confirmation dialogs requiring user action
- Use `role="complementary"` for side panels (like the SIPOC form panel)

### Focus Trap Implementation Pattern (React)

```typescript
import { useEffect, useRef, useCallback } from 'react';

function useFocusTrap(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Store trigger for focus restoration
    triggerRef.current = document.activeElement as HTMLElement;

    const focusable = getFocusableElements();
    if (focusable.length > 0) (focusable[0] as HTMLElement).focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      const first = elements[0] as HTMLElement;
      const last = elements[elements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus(); // Restore focus
    };
  }, [isOpen, onClose, getFocusableElements]);

  return containerRef;
}
```

### The `inert` Attribute (Modern Alternative)

Instead of manually managing `aria-hidden` and `tabindex` on background content:

```typescript
// When modal opens
document.getElementById('app-root')!.inert = true;

// When modal closes
document.getElementById('app-root')!.inert = false;
```

Supported in all major browsers (2024+). Disables interaction AND hides from assistive technology in one declaration.

### Keyboard Navigation Checklist

- **Tab / Shift+Tab** — Cycles through focusable elements; loops at boundaries
- **Escape** — Closes modal/panel, returns focus to trigger
- **Enter / Space** — Activates buttons and interactive elements
- **Arrow keys** — Navigate between related items (nodes, tabs)

### Visible Focus Indicators (WCAG 2.4.7 + 2.4.13)

```css
:focus-visible {
  outline: 3px solid #1a73e8;
  outline-offset: 2px;
  border-radius: 3px;
}
```

In Tailwind:
```html
<button class="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
```

Never remove focus outlines without providing a high-contrast alternative.

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Focus escapes modal | Dynamic content adds elements after trap init | Re-query focusable elements in keydown handler |
| Screen reader reads background | Background not inert | Apply `inert` attribute to app root |
| Focus doesn't return on close | Trigger ref lost | Store `document.activeElement` before opening |
| No visible focus indicator | CSS resets remove outlines | Add `:focus-visible` styles |

**Sources:**
- https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/ (Relevance: HIGH)
- https://clhenrick.io/blog/react-a11y-modal-dialog/ (Relevance: HIGH)
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39 (Relevance: MEDIUM)
- https://techoral.com/react/react-accessibility.html (Relevance: MEDIUM)

---


## 8. Prefers-Reduced-Motion — Accessible Animations

**Relevance: HIGH** — Task `3_47be87f3` specifically requires adding prefers-reduced-motion support for animated edges

### Tailwind CSS Modifiers

Tailwind provides two built-in modifiers:

- **`motion-safe:`** — Only applies styles when user has NOT requested reduced motion
- **`motion-reduce:`** — Only applies styles when user HAS requested reduced motion

```html
<!-- Animation only runs if user allows motion -->
<div class="motion-safe:animate-pulse motion-reduce:animate-none">

<!-- Transition only if motion is safe -->
<div class="motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none">

<!-- Alternative static state for reduced-motion users -->
<div class="motion-safe:animate-slowpan motion-reduce:bg-center">
```

### The Right Mental Model

**Don't start with animations and disable them.** Start WITHOUT animations and enable them conditionally:

```css
/* ❌ Bad: animations on by default, disable for reduced motion */
.animated-edge { transition: all 300ms; }
@media (prefers-reduced-motion: reduce) { .animated-edge { transition: none; } }

/* ✅ Good: no animation by default, enable for users who allow it */
.animated-edge { /* no transition */ }
@media (prefers-reduced-motion: no-preference) {
  .animated-edge { transition: all 300ms; }
}
```

In Tailwind, use `motion-safe:` prefix (equivalent to `no-preference`):

```html
<div class="motion-safe:transition-all motion-safe:duration-300">
```

### React Hook: `usePrefersReducedMotion`

For JS-driven animations (React Spring, animated SVG edges, etc.):

```typescript
function usePrefersReducedMotion(): boolean {
  const QUERY = '(prefers-reduced-motion: no-preference)';
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    setPrefersReducedMotion(!mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(!event.matches);
    };

    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}
```

Usage with animated edges:

```tsx
function AnimatedEdge({ ... }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Skip animation entirely for reduced-motion users
  const animationDuration = prefersReducedMotion ? 0 : 300;
  const dashAnimation = prefersReducedMotion ? 'none' : 'dashdraw 0.5s linear infinite';

  return <path style={{ animationDuration: `${animationDuration}ms`, animation: dashAnimation }} />;
}
```

### What to Disable vs. Keep

| Animation Type | Reduce? | Why |
|----------------|---------|-----|
| Large movement (parallax, slide-ins) | Yes | Triggers vestibular issues |
| Edge flow animations (dashed line moving) | Yes | Continuous motion, distracting |
| Opacity fades | No (usually safe) | No spatial movement |
| Color transitions | No (usually safe) | No spatial movement |
| Scale/bounce | Yes | Spatial motion |
| Spinner/loading | Replace | Use static indicator or reduced animation |

### Testing

In Chrome DevTools: Ctrl+Shift+P → type "reduce" → select "Emulate CSS prefers-reduced-motion: reduce"

**Sources:**
- https://www.joshwcomeau.com/react/prefers-reduced-motion/ (Relevance: HIGH)
- https://epicweb.dev/tips/motion-safe-and-motion-reduce-modifiers (Relevance: HIGH)
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39 (Relevance: HIGH)
- https://tailwindcss.com/docs/transition-duration (Relevance: MEDIUM)

---


## 9. React Router v7 — Patterns for This Project

**Relevance: HIGH** — Project uses `react-router-dom` v7.18; routing is core to multi-stream navigation

### Library Mode (Current Project Pattern)

The project uses React Router v7 in **library mode** — `BrowserRouter` + `Routes` + `Route` with JSX route definitions. This is the simpler approach (vs. data router/framework mode) and appropriate for this SPA.

### Key Patterns for Value Modeller

#### Nested Layouts with Outlet

```tsx
// Layout provides shell; Outlet renders child route
function AppLayout() {
  return (
    <div className="flex h-screen">
      <Header />
      <main className="flex-1">
        <Outlet />  {/* Child route renders here */}
      </main>
    </div>
  );
}

// Route definition
<Route path="/" element={<AppLayout />}>
  <Route index element={<LandingPage />} />
  <Route path="stream/:streamId" element={<CanvasEditor />} />
  <Route path="*" element={<NotFound />} />
</Route>
```

#### URL Parameters with `useParams`

```tsx
function CanvasEditor() {
  const { streamId } = useParams<{ streamId: string }>();
  // Load stream data based on streamId
}
```

#### Programmatic Navigation

```tsx
const navigate = useNavigate();

// Navigate to stream
navigate(`/stream/${streamId}`);

// Go back
navigate(-1);

// Replace current entry (no new history entry)
navigate('/streams', { replace: true });
```

#### Search Params for Shareable UI State

Use URL search params for state that should survive refresh and be shareable:

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const filter = searchParams.get('filter') || 'all';
const view = searchParams.get('view') || 'card';

// Update without navigation
setSearchParams({ filter: 'active', view: 'table' });
```

**Good for URL:** filters, pagination, sort order, view mode
**Bad for URL:** selected node, panel open/closed, draft text

#### Code Splitting with React.lazy

```tsx
const CanvasEditor = lazy(() => import('./pages/CanvasEditor'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

<Suspense fallback={<LoadingSkeleton />}>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/stream/:streamId" element={<CanvasEditor />} />
  </Routes>
</Suspense>
```

### Testing Routes

```tsx
import { MemoryRouter } from 'react-router-dom';

// Wrap in MemoryRouter for tests
render(
  <MemoryRouter initialEntries={['/stream/abc123']}>
    <App />
  </MemoryRouter>
);
```

### Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using `<a href>` instead of `<Link>` | Causes full page reload; use `<Link to="...">` |
| Server returns 404 on refresh | Configure server to serve index.html for all routes |
| Back button goes to unexpected state | Use `replace: true` for state changes that shouldn't create history |
| Stale data after navigation | Re-fetch data when params change (use key on route or effect deps) |

**Sources:**
- https://thelinuxcode.com/react-router-dom-on-npm-a-2026-field-guide-for-predictable-routing/ (Relevance: HIGH)
- https://micropyramid.com/blog/react-router-for-navigation/ (Relevance: MEDIUM)
- https://reactrouter.com/en/main (Relevance: HIGH)

---


## 10. SOLID Principles in React — Custom Hook & Component Composition

**Relevance: HIGH** — Project has many custom hooks; tasks require extracting logic (e.g., `3_ec3fe23c` extracts sub-concerns into hooks)

### Single Responsibility Principle (SRP)

Each component/hook should have **one reason to change**.

**Pattern:** Split "god components" into:
- **Custom hooks** for data fetching and state logic
- **Utility functions** for business logic (filtering, transformation)
- **Presentational components** for pure UI rendering
- **Container components** for composition

```typescript
// ❌ Bad: one component does everything
function FlowCanvas() {
  // 200 lines mixing: event handlers, state, layout, rendering, persistence
}

// ✅ Good: concerns extracted into focused hooks
function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useGraphStore(selector);
  const { handleConnect } = useConnectionLogic();
  const { contextMenu, onContextMenu } = useCanvasContextMenu();
  const { helperLines, onNodeDrag } = useHelperLines();
  const { clipboard, onCopy, onPaste } = useCanvasClipboard();

  return <ReactFlow ... />;
}
```

### Open/Closed Principle (OCP)

Components should be **open for extension** but **closed for modification**.

**Pattern:** Use composition and props instead of internal conditionals:

```typescript
// ❌ Bad: modify component for every new node type
function NodeComponent({ type }) {
  if (type === 'sipoc') return <SipocView />;
  if (type === 'group') return <GroupView />;
  // Must edit this file for every new type
}

// ✅ Good: use React Flow's nodeTypes registry
const nodeTypes = {
  sipoc: SipocNodeComponent,
  group: GroupNodeComponent,
  // Add new types without modifying existing code
};
<ReactFlow nodeTypes={nodeTypes} ... />
```

### Dependency Inversion Principle (DIP)

High-level components depend on abstractions (props/hooks), not concrete implementations.

**Pattern:** Pass dependencies via props or hooks:

```typescript
// ❌ Bad: component tightly coupled to specific store
function NodeCard() {
  const data = useGraphStore(s => s.getNodeById('hardcoded-id'));
}

// ✅ Good: component receives data via props
function NodeCard({ nodeData }: { nodeData: SipocNodeData }) {
  // Pure presentational — works with any data source
}
```

### Interface Segregation Principle (ISP)

Don't force components to depend on props they don't use.

**Pattern:** Use `children` composition instead of bloated prop interfaces:

```typescript
// ❌ Bad: monolithic prop interface
<Panel showClose showMinimize title="..." onClose={...} onMinimize={...} theme="..." />

// ✅ Good: compose only what's needed
<Panel title="SIPOC Details">
  <CloseButton onClick={onClose} />
  {children}
</Panel>
```

### Custom Hook Composition Rules

1. **One concern per hook** — `useHelperLines`, `useCanvasClipboard`, `useProximityConnect`
2. **Pure at the top level** — hooks must be called unconditionally (Rules of Hooks)
3. **Return stable references** — use `useCallback` for returned functions
4. **Accept configuration via params** — make hooks reusable across contexts
5. **Clean up side effects** — always return cleanup functions from `useEffect`
6. **Compose hooks in container** — the flow canvas composes 5-6 hooks; each is testable alone

### Extracting Hooks from Components (Refactoring Pattern)

When a component grows beyond ~150 lines:

1. Identify clusters of related state + effects
2. Extract each cluster into a `useXxx` hook
3. The hook returns only the values/handlers the component needs
4. The component becomes a thin render layer composing hooks

```typescript
// Before: 300-line component with mixed concerns
// After:
function FlowCanvas() {
  const graph = useGraphStore(graphSelector);
  const contextMenu = useCanvasContextMenu();
  const clipboard = useCanvasClipboard();
  const helperLines = useHelperLines();
  const groupDrag = useGroupDragDetection();

  return (
    <ReactFlow
      onContextMenu={contextMenu.onContextMenu}
      onNodeDrag={helperLines.onNodeDrag}
      {...graph}
    >
      {contextMenu.isOpen && <ContextMenu {...contextMenu} />}
      {helperLines.visible && <HelperLines {...helperLines} />}
    </ReactFlow>
  );
}
```

**Sources:**
- https://elvisduru.com/blog/applying-solid-principles-in-react-a-practical-guide (Relevance: HIGH)
- https://certificates.dev/blog/writing-custom-hooks-in-react-patterns-pitfalls-and-when-to-reach-for-one (Relevance: HIGH)
- https://feature-sliced.design/blog/react-hooks-architecture (Relevance: MEDIUM)

---


## 11. React.memo, useCallback, useMemo — When They Help vs. Hurt

**Relevance: HIGH** — SmartEdge memoization task, performance optimization tasks, React Flow requires memoized handlers

### When to Use Each

| Tool | What it Memoizes | Use When |
|------|-----------------|----------|
| `React.memo` | Component output | Expensive render; parent re-renders often without changing this child's props |
| `useMemo` | Computed value | Expensive calculation (filter/sort/transform large data); stable object reference needed |
| `useCallback` | Function reference | Function passed to memoized child; function in effect dependency array |

### Rules for This Project

**Always memoize:**
- Custom React Flow node components (`React.memo`)
- Custom React Flow edge components (`React.memo`)
- All React Flow event handlers (`useCallback`) — `onNodesChange`, `onEdgesChange`, `onConnect`, `onNodeClick`, etc.
- Objects/arrays passed as props to React Flow (`useMemo`) — `defaultEdgeOptions`, `snapGrid`, `nodeTypes`, `edgeTypes`

**Don't bother memoizing:**
- Simple leaf components with cheap renders
- Values that are already primitives (strings, numbers, booleans)
- Functions that aren't passed as props to memoized children
- Calculations that take < 1ms

### Pattern: Memoized Custom Edge Component

```tsx
import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';

// ✅ Memoize edge components — they re-render on every node drag without this
const SmartEdge = memo(function SmartEdge({ id, source, target, ...props }: EdgeProps) {
  // ❌ Don't subscribe to nodes array here!
  // const nodes = useGraphStore(s => s.nodes); // Causes re-render on every drag

  // ✅ Use imperative access instead
  const { getNodes } = useReactFlow();

  const path = useMemo(() => {
    const nodes = getNodes();
    return computeSmartPath(source, target, nodes);
  }, [source, target, getNodes]);

  return <BaseEdge path={path} {...props} />;
});
```

### Pattern: Stable nodeTypes / edgeTypes

```tsx
// ✅ Define OUTSIDE component or in useMemo — prevents React Flow from re-registering
const nodeTypes = { sipoc: SipocNodeComponent, group: GroupNodeComponent };
const edgeTypes = { smart: SmartEdge, labeled: LabeledEdge };

function FlowCanvas() {
  // ❌ DON'T define inside render — creates new object every render
  // const nodeTypes = { sipoc: SipocNode };

  return <ReactFlow nodeTypes={nodeTypes} edgeTypes={edgeTypes} ... />;
}
```

### Pattern: Stable Event Handlers

```tsx
function FlowCanvas() {
  // ✅ Memoize handlers — React Flow compares by reference
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  const handlePaneClick = useCallback(() => {
    deselectNode();
  }, [deselectNode]);

  return <ReactFlow onNodeClick={handleNodeClick} onPaneClick={handlePaneClick} ... />;
}
```

### Anti-Patterns to Avoid

| Anti-Pattern | Why it's Bad | Fix |
|--------------|-------------|-----|
| `memo` on every component | Adds comparison overhead with zero benefit | Only memo components with expensive renders or frequent parent re-renders |
| Inline object/array as prop to memoized child | New reference every render defeats `memo` | Extract to `useMemo` or module-level constant |
| `useCallback` with unstable deps | Re-creates function anyway | Use functional state updates (`setState(prev => ...)`) to minimize deps |
| `useMemo` for cheap operations | Cache overhead > computation cost | Only memoize when computation is measurably expensive |
| Memoizing inside map loops | Hook rules violation | Extract mapped item to separate memoized component |

### Measuring Performance

Before optimizing, profile first:
1. React DevTools Profiler — identify which components re-render and why
2. Chrome Performance tab — find long tasks during interaction
3. `console.count('SmartEdge render')` — quick check for render frequency

**Sources:**
- https://www.debugbear.com/blog/react-usememo-usecallback (Relevance: HIGH)
- https://kentcdodds.com/blog/usememo-and-usecallback (Relevance: HIGH)
- https://reactflow.dev/learn/advanced-use/performance (Relevance: HIGH)
- https://freecodecamp.org/news/how-to-avoid-overusing-usecallback-and-usememo-in-react (Relevance: MEDIUM)

---


## 12. Quick Reference — Guidelines Mapped to Active Tasks

| Task Category | Relevant Sections | Key Takeaway |
|---------------|-------------------|--------------|
| Dark mode fixes (5+ tasks) | §6 Dark Mode | Always pair light classes with `dark:` variants; use React Flow `colorMode` prop |
| SmartEdge performance | §1 React Flow, §11 Memoization | Use `useReactFlow().getNodes()` for imperative access; wrap with `React.memo` |
| Focus trap / ARIA dialog | §7 Accessibility | Use `useFocusTrap` hook; apply `inert` to background; restore focus on close |
| Keyboard navigation | §7 Accessibility | Arrow keys between nodes; Tab through focusable elements; visible focus rings |
| prefers-reduced-motion | §8 Reduced Motion | `motion-safe:` prefix for Tailwind animations; `usePrefersReducedMotion` hook for JS |
| Undo/redo | §4 Zundo | `temporal` middleware with `partialize`, `limit: 50`, debounced `handleSet` |
| Unit tests (frontend) | §5 Vitest + RTL | `getByRole` first; `userEvent` over `fireEvent`; mock ResizeObserver for React Flow |
| Unit tests (TecFactory) | §5 Vitest + Supertest | AAA pattern; ESM `.test.mjs` files; isolate tests with cleanup |
| Custom hook extraction | §10 SOLID/Hooks | One concern per hook; return stable refs; compose in container component |
| Auto-layout | §2 Dagre | Reset graph before layout; use actual node dimensions; `fitView()` after |
| Export/Import | §3 Zustand, §9 Router | JSON file download/upload; persist with error handling; keep URLs shareable |
| Node grouping / swimlanes | §1 React Flow (Sub-Flows) | Parent before children in array; `extent: 'parent'`; relative positioning |
| Route navigation | §9 React Router v7 | Use `<Link>` not `<a>`; lazy load routes; `useParams` for stream ID |

---

*End of document. Research covers the primary technology concerns identified from the codebase, specifications, and task queue.*