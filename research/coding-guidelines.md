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