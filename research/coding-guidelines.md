# Research: Coding Guidelines & Standard Practices for Value Modeller

**Last Updated:** 2026-07-15T12:52:10+02:00

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

### Cycle Detection / DAG Validation (Official Pattern)

```typescript
import { getOutgoers, useReactFlow } from '@xyflow/react';

const { getNodes, getEdges } = useReactFlow();

const isValidConnection = useCallback(
  (connection) => {
    const nodes = getNodes();
    const edges = getEdges();
    const target = nodes.find((node) => node.id === connection.target);

    const hasCycle = (node, visited = new Set()) => {
      if (visited.has(node.id)) return false;
      visited.add(node.id);

      for (const outgoer of getOutgoers(node, nodes, edges)) {
        if (outgoer.id === connection.source) return true;
        if (hasCycle(outgoer, visited)) return true;
      }
    };

    if (target.id === connection.source) return false;
    return !hasCycle(target);
  },
  [getNodes, getEdges],
);
```

### Testing React Flow Components

```typescript
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

**Sources:**
- https://reactflow.dev/learn/advanced-use/performance (Relevance: HIGH)
- https://reactflow.dev/learn/advanced-use/state-management (Relevance: HIGH)
- https://reactflow.dev/api-reference/hooks/use-store-api (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/context-menu (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/drag-and-drop (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/prevent-cycles (Relevance: HIGH)
- https://reactflow.dev/examples/grouping/selection-grouping (Relevance: HIGH)
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

### Zustand v5 Selector Best Practices

From the official Zustand v5 migration discussion, selectors in v5 fall into three categories:

**1. Simple selectors (no `useShallow` needed):**
```typescript
// Returns primitive or stable reference — no extra wrapping needed
const prop = useStore(state => state.prop);
const nodes = useStore(state => state.nodes); // stable if not transformed
```

**2. Selectors that transform state (use `useShallow`):**
```typescript
import { useShallow } from 'zustand/react/shallow';

// Returns new array each time — useShallow prevents re-renders when values haven't changed
const nodeNames = useStore(useShallow(state => state.nodes.map(n => n.data.processName)));
```

**3. Selectors with nested objects (`useShallow` insufficient):**
```typescript
// When selector produces nested objects with new references, useShallow causes max-depth errors
// Solution: keep selectors simple, derive data outside the selector
const nodes = useStore(state => state.nodes);
const nodesWithExtra = nodes.map(n => ({ ...n, computed: derive(n) })); // derive outside
```

**Key v5 insight from maintainers:** Keep selectors as simple as possible. Perform transformations outside the selector (e.g., in a custom hook). This ensures stable selector output.

### Persist Middleware — Complete Configuration (Zustand v5)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create<MyState>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'value-modeller-graph',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        modelName: state.modelName,
      }),
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Handle migration from version 0 to 1
        }
        return persistedState as MyState;
      },
    },
  ),
);
```

### Version Migration Pattern

When your store schema evolves:

1. **Increment the `version` number** in persist options
2. **Implement `migrate` function** to transform old state to new shape
3. Zustand detects version mismatch and runs migration automatically

```typescript
{
  version: 2,
  migrate: (persistedState: any, version: number) => {
    if (version === 0) {
      persistedState.nodes = persistedState.fishes;
      delete persistedState.fishes;
    }
    if (version <= 1) {
      persistedState.metadata = persistedState.metadata || { createdAt: new Date().toISOString() };
    }
    return persistedState;
  },
}
```

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
- Consider IndexedDB (via `idb-keyval`) if data grows beyond localStorage limits

### IndexedDB as Alternative Storage (for larger data)

If the project outgrows localStorage (5MB limit), Zustand's persist middleware supports custom async storage via `createJSONStorage`:

```typescript
import { get, set, del } from 'idb-keyval';

const indexedDbStorage = {
  getItem: async (name: string) => (await get(name)) || null,
  setItem: async (name: string, value: string) => { await set(name, value); },
  removeItem: async (name: string) => { await del(name); },
};

// Usage:
persist(storeCreator, {
  name: 'value-modeller-graph',
  storage: createJSONStorage(() => indexedDbStorage),
});
```

### Testing Zustand Stores (Official Guide)

```typescript
import { act } from '@testing-library/react';

const storeResetFns = new Set<() => void>();

export const registerStoreReset = (resetFn: () => void) => {
  storeResetFns.add(resetFn);
};

beforeEach(async () => {
  await act(() => {
    storeResetFns.forEach((resetFn) => resetFn());
  });
});
```

**Key patterns:**
- Test store actions by calling them directly via `store.getState().actionName()`
- Verify state changes with `store.getState()` after action calls
- Use `renderHook` to test custom hooks that wrap store selectors
- Mock the store module for component tests where you need controlled state

### Hydration Check Pattern

```typescript
const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsubFinish = useStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useStore.persist.hasHydrated());
    return () => { unsubFinish(); };
  }, []);
  return hydrated;
};
```

**Sources:**
- https://zustand.docs.pmnd.rs/reference/middlewares/persist (Relevance: HIGH)
- https://github.com/pmndrs/zustand/discussions/2867 (Relevance: HIGH)
- https://zustand.docs.pmnd.rs/learn/guides/testing (Relevance: HIGH)

---

## 4. Zundo — Undo/Redo Middleware for Zustand

**Relevance: HIGH** — Project has undo/redo task; `zundo` is the standard solution for Zustand stores (<700 bytes)

### Basic Setup

```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

const useGraphStore = create<StoreState>()(
  temporal(
    (set) => ({
      nodes: [],
      edges: [],
      addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
      removeNode: (id) => set((s) => ({ nodes: s.nodes.filter(n => n.id !== id) })),
    }),
    {
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      limit: 50,
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
const { undo, redo, clear } = useGraphStore.temporal.getState();

import { useStoreWithEqualityFn } from 'zustand/traditional';

function useTemporalStore<T>(selector: (state: TemporalState) => T) {
  return useStoreWithEqualityFn(useGraphStore.temporal, selector);
}

const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
const canRedo = useTemporalStore((s) => s.futureStates.length > 0);
```

### Pause/Resume Tracking

```typescript
const { pause, resume } = useGraphStore.temporal.getState();

// Pause during auto-layout (single action, not individual moves)
pause();
performAutoLayout();
resume();
```

**Sources:**
- https://github.com/charkour/zundo (Relevance: HIGH)
- https://www.npmjs.com/package/zundo (Relevance: HIGH)

---


## 5. Vitest + React Testing Library — Best Practices

**Relevance: HIGH** — Multiple tasks require unit tests for both the value modeller frontend and TecFactory backend

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

1. **`getByRole`** — Best for accessibility (buttons, headings, dialogs)
2. **`getByLabelText`** — Great for form elements
3. **`getByPlaceholderText`** — For inputs with placeholders
4. **`getByText`** — For non-interactive display elements
5. **`getByDisplayValue`** — For filled-in form elements
6. **`getByTestId`** — Last resort when other queries don't work

### User Event over fireEvent

```typescript
import userEvent from '@testing-library/user-event';

it('handles click', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick} />);
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
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
- https://vitest.dev/guide/ (Relevance: HIGH)
- https://testing-library.com/docs/react-testing-library/cheatsheet/ (Relevance: HIGH)
- https://kentcdodds.com/blog/common-mistakes-with-react-testing-library (Relevance: HIGH)

---

## 5b. TecFactory Backend Testing — Express + Vitest + Supertest

**Relevance: HIGH** — TecFactory uses Express.js with ESM; tasks require REST API testing

### Critical Architecture Pattern: Separate App from Server

```javascript
// server.js — exports app for testing
import express from 'express';
const app = express();
app.use(express.json());
// ... routes ...

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(3500, () => console.log('Running on :3500'));
}

export { app };
```

```javascript
// tests/tasks.test.mjs — import app without starting server
import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../server.js';

const request = supertest(app);

describe('Tasks REST API', () => {
  it('should return tasks list', async () => {
    const response = await request.get('/api/tasks');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### Key Patterns for Express + Vitest

| Pattern | Description |
|---------|-------------|
| **Export app, don't listen** | Supertest creates its own ephemeral server |
| **AAA structure** | Arrange → Act → Assert with clear comments |
| **Test error paths** | 400 for validation, 404 for missing resources, 500 for server errors |
| **Test response shape** | Verify status, content-type, and body structure |
| **Clean state between tests** | Use `beforeEach` to reset; don't depend on test order |
| **Run sequentially** | Use `--sequence` if tests share file system state |

### Testing Patterns by HTTP Method

```javascript
// GET — happy path + not found
it('should return 200 with task list', async () => {
  const res = await request.get('/api/tasks');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/json/);
});

// POST — happy path + validation
it('should create task with valid data', async () => {
  const task = { title: 'Test', priority: 2, type: 'bug' };
  const res = await request.post('/api/tasks').send(task);
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test');
});

// Security — path traversal
it('should reject path traversal in task ID', async () => {
  const res = await request.get('/api/tasks/../../../etc/passwd');
  expect(res.status).toBe(400);
});
```

### Best Practices

1. **Clean state before each test, not after** — if a test fails and skips `afterEach`, the next test inherits dirty state
2. **Use `forceExit`/`detectOpenHandles`** in config — Express apps frequently leave connections open
3. **One test file per resource** — keep files under 300 lines
4. **Test error paths as thoroughly as success paths** — error responses are part of your API contract
5. **Extract helpers** — token generation, fixtures, cleanup functions go in `tests/helpers/`

**Sources:**
- https://grizzlypeaksoftware.com/library/integration-testing-patterns-with-expressjs-7mfqbms5 (Relevance: HIGH)
- https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies (Relevance: HIGH)
- https://www.npmjs.com/package/supertest (Relevance: HIGH)

---


## 6. Tailwind CSS Dark Mode — Architecture & Patterns

**Relevance: HIGH** — Multiple tasks fix dark mode inconsistencies

### Architecture (Three Pieces)

1. **CSS Variables** — Define a palette in `:root` and override in `.dark`
2. **Class Toggle** — Add/remove `dark` class on `<html>`
3. **Init Script** — Read stored preference BEFORE paint to avoid flash

### The `cn()` Utility Pattern

```typescript
// src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Checklist for Every Component

1. All `bg-*` classes need a `dark:bg-*` counterpart
2. All `text-*` classes need `dark:text-*`
3. All `border-*` classes need `dark:border-*`
4. Focus rings: `focus:ring-blue-500 dark:focus:ring-blue-400`
5. Form inputs: `dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600`
6. Disabled states: `dark:text-gray-500 dark:bg-gray-800`
7. Shadows: `shadow-lg dark:shadow-gray-900/50`

### React Flow + Dark Mode

React Flow v12 provides a built-in `colorMode` prop. Do NOT manually override these with Tailwind `!important` — it breaks the minimap.

**Sources:**
- https://tailwindcss.com/docs/dark-mode (Relevance: HIGH)
- https://reactflow.dev/examples/styling/dark-mode (Relevance: HIGH)

---

## 7. Accessibility — Focus Traps, ARIA Dialogs, Keyboard Navigation

**Relevance: HIGH** — Multiple tasks: focus trapping in dialogs, ARIA dialog semantics, keyboard navigation between nodes

### Required ARIA Attributes for Dialogs

```html
<div role="dialog" aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-desc">
  <h2 id="modal-title">Title</h2>
  <p id="modal-desc">Description</p>
</div>
```

- Use `role="alertdialog"` for confirmation dialogs
- Use `role="complementary"` for side panels (like the SIPOC form panel)

### Focus Trap Implementation Pattern (React)

```typescript
function useFocusTrap(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement as HTMLElement;

    const getFocusable = () => {
      if (!containerRef.current) return [];
      return containerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
    };

    const focusable = getFocusable();
    if (focusable.length > 0) (focusable[0] as HTMLElement).focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const elements = getFocusable();
      const first = elements[0] as HTMLElement;
      const last = elements[elements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
```

### The `inert` Attribute (Modern Alternative)

```typescript
document.getElementById('app-root')!.inert = true;  // When modal opens
document.getElementById('app-root')!.inert = false; // When modal closes
```

Supported in all major browsers (2024+). Disables interaction AND hides from assistive technology.

### Keyboard Navigation Checklist

- **Tab / Shift+Tab** — Cycles through focusable elements; loops at boundaries
- **Escape** — Closes modal/panel, returns focus to trigger
- **Enter / Space** — Activates buttons and interactive elements
- **Arrow keys** — Navigate between related items (nodes, tabs)

**Sources:**
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (Relevance: HIGH)
- https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/ (Relevance: HIGH)

---

## 8. Prefers-Reduced-Motion — Accessible Animations

**Relevance: HIGH** — Task requires adding prefers-reduced-motion support for animated edges

### Tailwind CSS Modifiers

```html
<div class="motion-safe:animate-pulse motion-reduce:animate-none">
<div class="motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none">
```

### React Hook: `usePrefersReducedMotion`

```typescript
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const QUERY = '(prefers-reduced-motion: no-preference)';
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

### What to Disable vs. Keep

| Animation Type | Reduce? | Why |
|----------------|---------|-----|
| Large movement (parallax, slide-ins) | Yes | Triggers vestibular issues |
| Edge flow animations (dashed line moving) | Yes | Continuous motion, distracting |
| Opacity fades | No (usually safe) | No spatial movement |
| Color transitions | No (usually safe) | No spatial movement |

### CSS for React Flow Animated Edges

```css
@media (prefers-reduced-motion: reduce) {
  .react-flow__edge-path {
    animation: none !important;
  }
}
```

**Sources:**
- https://www.joshwcomeau.com/react/prefers-reduced-motion/ (Relevance: HIGH)
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39 (Relevance: HIGH)

---


## 9. React Router v7 — Patterns for This Project

**Relevance: HIGH** — Project uses `react-router-dom` v7.18; routing is core to multi-stream navigation

### Library Mode (Current Project Pattern)

The project uses React Router v7 in **library mode** — `BrowserRouter` + `Routes` + `Route` with JSX route definitions.

### Key Patterns

```tsx
// Nested Layouts with Outlet
function AppLayout() {
  return (
    <div className="flex h-screen">
      <Header />
      <main className="flex-1"><Outlet /></main>
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

### Route-Level Code Splitting with React.lazy

```tsx
import { Suspense, lazy } from 'react';

const LandingPage = lazy(() => import('./components/landing/landing-page'));
const StreamEditor = lazy(() => import('./components/layout/stream-editor'));

// In routes:
<Route index element={
  <Suspense fallback={<LoadingSpinner />}>
    <LandingPage />
  </Suspense>
} />
<Route path="stream/:streamId" element={
  <Suspense fallback={<LoadingSpinner />}>
    <StreamEditor />
  </Suspense>
} />
```

Key points:
- Use `React.lazy()` with dynamic `import()` — Vite automatically creates separate chunks
- Wrap lazy components in `<Suspense>` with a loading fallback
- For named exports: `lazy(() => import('./module').then(m => ({ default: m.NamedExport })))`
- Initial bundle size reduces by 50-70% when splitting route-level components

### Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using `<a href>` instead of `<Link>` | Causes full page reload; use `<Link to="...">` |
| Server returns 404 on refresh | Configure server to serve index.html for all routes |
| Back button goes to unexpected state | Use `replace: true` for state changes that shouldn't create history |

**Sources:**
- https://reactrouter.com/en/main (Relevance: HIGH)
- https://www.robinwieruch.de/react-router-lazy-loading/ (Relevance: HIGH)
- https://remix.run/blog/faster-lazy-loading (Relevance: HIGH)

---

## 10. SOLID Principles in React — Custom Hook & Component Composition

**Relevance: HIGH** — Project has many custom hooks; tasks require extracting logic into hooks

### Single Responsibility Principle (SRP)

```typescript
// ❌ Bad: one component does everything (300+ lines)
function FlowCanvas() { /* event handlers + state + layout + rendering + persistence */ }

// ✅ Good: concerns extracted into focused hooks
function FlowCanvas() {
  const graph = useGraphStore(graphSelector);
  const contextMenu = useCanvasContextMenu();
  const clipboard = useCanvasClipboard();
  const helperLines = useHelperLines();
  const groupDrag = useGroupDragDetection();
  return <ReactFlow ... />;
}
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

**Sources:**
- https://elvisduru.com/blog/applying-solid-principles-in-react-a-practical-guide (Relevance: HIGH)
- https://certificates.dev/blog/writing-custom-hooks-in-react-patterns-pitfalls-and-when-to-reach-for-one (Relevance: HIGH)

---

## 11. React.memo, useCallback, useMemo — When They Help vs. Hurt

**Relevance: HIGH** — SmartEdge memoization task, performance optimization tasks

### When to Use Each

| Tool | What it Memoizes | Use When |
|------|-----------------|----------|
| `React.memo` | Component output | Expensive render; parent re-renders often without changing this child's props |
| `useMemo` | Computed value | Expensive calculation; stable object reference needed |
| `useCallback` | Function reference | Function passed to memoized child; function in effect dependency array |

### Rules for This Project

**Always memoize:**
- Custom React Flow node components (`React.memo`)
- Custom React Flow edge components (`React.memo`)
- All React Flow event handlers (`useCallback`)
- Objects/arrays passed as props to React Flow (`useMemo`) — `defaultEdgeOptions`, `snapGrid`, `nodeTypes`, `edgeTypes`

**Don't bother memoizing:**
- Simple leaf components with cheap renders
- Values that are already primitives
- Functions that aren't passed as props to memoized children

### Pattern: Stable nodeTypes / edgeTypes

```tsx
// ✅ Define OUTSIDE component — prevents React Flow from re-registering
const nodeTypes = { sipoc: SipocNodeComponent, group: GroupNodeComponent };
const edgeTypes = { smart: SmartEdge, labeled: LabeledEdge };

function FlowCanvas() {
  return <ReactFlow nodeTypes={nodeTypes} edgeTypes={edgeTypes} ... />;
}
```

**Sources:**
- https://reactflow.dev/learn/advanced-use/performance (Relevance: HIGH)
- https://kentcdodds.com/blog/usememo-and-usecallback (Relevance: HIGH)

---


## 12. Export/Import JSON — File Download Pattern

**Relevance: HIGH** — Project has export/import feature

### Download JSON File (Browser)

```typescript
export function downloadJsonFile(data: object, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### Import JSON File (Browser)

```typescript
export function importJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        resolve(data);
      } catch (e) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
```

### Validation Pattern

```typescript
function isValidExportedModel(data: unknown): data is ExportedModel {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return false;
  return obj.nodes.every(node =>
    typeof node === 'object' && node !== null &&
    'id' in node && 'position' in node && 'data' in node
  );
}
```

**Sources:**
- https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static (Relevance: MEDIUM)

---

## 13. React Error Boundaries — Crash Protection

**Relevance: HIGH** — Active task to add Error Boundary for demo safety; prevents white screen crashes

### What Boundaries Catch (and Don't)

**Caught:** Errors during rendering, lifecycle methods, constructors of child components.
**NOT caught:** Event handlers, async code, server-side rendering.

### TypeScript Error Boundary Component

```typescript
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p>Something went wrong.</p>;
    }
    return this.props.children;
  }
}
```

### Where to Place Boundaries

- **App root** — Prevents full white screen; shows reload option
- **Per route/page** — One broken page doesn't kill another
- **Around optional features** — Sidebar, recommendations, charts (non-critical UI)
- **Around third-party code** — Embedded widgets, library components you don't control

### Fallback UX Best Practices

Good fallbacks should:
- Acknowledge that something broke, briefly
- Offer a recovery action (try again, refresh, clear data and reload)
- Show a reduced version of the feature if possible
- Never show raw error messages to end users

### Reset Pattern with `react-error-boundary`

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Something went wrong: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Usage — resetKeys causes boundary to reset when key changes
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => reportError(error, info.componentStack)}
  resetKeys={[streamId]}
>
  <StreamEditor />
</ErrorBoundary>
```

### ChunkLoadError Handling (For Code-Split Apps)

When using `React.lazy()`, network failures cause `ChunkLoadError`. Handle it specifically:

```typescript
static getDerivedStateFromError(error: Error): State {
  if (error.name === 'ChunkLoadError') {
    // Offer page reload instead of generic error
    return { hasError: true, error, isChunkError: true };
  }
  return { hasError: true, error, isChunkError: false };
}
```

**Sources:**
- https://paulund.co.uk/notebook/react/react-error-boundaries-in-practice/ (Relevance: HIGH)
- https://stevekinney.com/courses/react-typescript/error-boundaries-and-suspense-boundaries (Relevance: HIGH)

---


## 14. TypeScript Strict Mode — Patterns for React

**Relevance: HIGH** — Project uses TypeScript strict mode; coding standards demand no `any`; multiple component/hook tasks need proper typing

### Essential Strict Options for React

| Option | What it Catches |
|--------|----------------|
| `noImplicitAny` | Untyped props, event handlers, `useState()` without type param |
| `strictNullChecks` | Optional props accessed without null check; API data that might be null |
| `noImplicitReturns` | Components with missing return in some branches |
| `strictFunctionTypes` | Callback props with wrong signatures |

### Common Patterns

**Always type `useState` for complex/nullable state:**
```typescript
// ❌ TypeScript infers type as undefined
const [user, setUser] = useState();

// ✅ Explicit null union
const [user, setUser] = useState<User | null>(null);
```

**Event handler typing (reference table):**

| Element | Event Type | Use Case |
|---------|-----------|----------|
| `<input>`, `<textarea>` | `React.ChangeEvent<HTMLInputElement>` | Form inputs |
| `<form>` | `React.FormEvent<HTMLFormElement>` | Form submission |
| `<button>`, `<div>` | `React.MouseEvent<HTMLButtonElement>` | Click handlers |
| `<input>` | `React.KeyboardEvent<HTMLInputElement>` | Keyboard shortcuts |

**Prop typing with utility types:**
```typescript
// Extend native HTML attributes for proper prop spreading
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: 'primary' | 'secondary' | 'danger';
};

// Pick/Omit for reuse
type PublicUser = Omit<User, 'password'>;
type UserPreview = Pick<User, 'id' | 'name'>;
```

**Discriminated unions for state machines:**
```typescript
type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

**`forwardRef` typing:**
```typescript
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder, error }, ref) => {
    return <input ref={ref} placeholder={placeholder} />;
  },
);
Input.displayName = 'Input';
```

**Context with type guard:**
```typescript
const ThemeContext = createContext<Theme | undefined>(undefined);

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme; // TypeScript narrows to Theme (not Theme | undefined)
}
```

### When to Use `// @ts-expect-error`

Prefer `@ts-expect-error` over `@ts-ignore` — it fails if the error disappears (ensuring you remove the suppression when it's no longer needed):
```typescript
// @ts-expect-error: third-party library has incorrect types for this method
const result = poorlyTypedLibrary.method();
```

**Sources:**
- https://stevekinney.com/courses/react-typescript/strictness-options-for-react (Relevance: HIGH)
- https://www.greatfrontend.com/blog/typescript-for-react-developers (Relevance: HIGH)

---

## 15. Vite 6 Build Optimization — Code Splitting & Bundle Size

**Relevance: MEDIUM** — Relevant for production deployment and demo performance; project uses Vite 6

### Manual Chunk Splitting for This Project

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'flow-vendor': ['@xyflow/react'],
          'state-vendor': ['zustand'],
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
```

### Route-Based Code Splitting

Combine React.lazy with Vite's automatic chunk creation:
```typescript
const LandingPage = lazy(() => import('./components/landing/landing-page'));
const StreamEditor = lazy(() => import('./components/layout/stream-editor'));
```

Each dynamic `import()` becomes a separate chunk that loads only when the route is visited.

### Tree Shaking Best Practices

```typescript
// ❌ Imports entire library
import _ from 'lodash';

// ✅ Import specific functions (tree-shakeable)
import { debounce, throttle } from 'lodash-es';
```

### Bundle Analysis

```typescript
// vite.config.ts — add for analysis
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    filename: 'dist/stats.html',
    open: true,
    gzipSize: true,
    brotliSize: true,
  }),
],
```

### Key Optimization Results (Typical)

| Technique | Bundle Size Reduction |
|-----------|----------------------|
| Vendor chunk splitting | 40-60% main bundle |
| Route-based code splitting | 50-70% initial load |
| Tree shaking (ES modules) | 200-500KB |

**Sources:**
- https://markaicode.com/vite-6-build-optimization-guide/ (Relevance: HIGH)
- https://stevekinney.com/courses/react-typescript/vite-react-typescript-optimization (Relevance: MEDIUM)

---


## 16. Quick Reference — Guidelines Mapped to Active Tasks

| Task Category | Relevant Sections | Key Takeaway |
|---------------|-------------------|--------------|
| Dark mode fixes (5+ tasks) | §6 Dark Mode | Always pair light classes with `dark:` variants; use React Flow `colorMode` prop; never use `!important` on colors |
| SmartEdge performance | §1 React Flow, §11 Memoization | Use `useReactFlow().getNodes()` for imperative access; wrap with `React.memo` |
| Focus trap / ARIA dialog | §7 Accessibility | Use `useFocusTrap` hook; apply `inert` to background; restore focus on close |
| Keyboard navigation | §7 Accessibility | Arrow keys between nodes; Tab through focusable elements; visible focus rings |
| prefers-reduced-motion | §8 Reduced Motion | `motion-safe:` prefix for Tailwind animations; `usePrefersReducedMotion` hook for JS |
| Undo/redo | §4 Zundo | `temporal` middleware with `partialize`, `limit: 50`, debounced `handleSet` |
| Unit tests (frontend) | §5 Vitest + RTL | `getByRole` first; `userEvent` over `fireEvent`; mock ResizeObserver for React Flow |
| Unit tests (TecFactory) | §5b Express + Supertest | AAA pattern; separate app from server; ESM `.test.mjs` files |
| Custom hook extraction | §10 SOLID/Hooks | One concern per hook; return stable refs; compose in container component |
| Auto-layout | §2 Dagre | Reset graph before layout; use actual node dimensions; `fitView()` after |
| Export/Import | §12 JSON Export | Blob + createObjectURL for download; FileReader for import; validate shape |
| Node grouping / swimlanes | §1 React Flow (Sub-Flows) | Parent before children in array; `extent: 'parent'`; relative positioning |
| Cycle detection / DAG | §1 React Flow (Cycle) | Use `getOutgoers` util; `isValidConnection` callback; DFS traversal |
| Route navigation | §9 React Router v7 | Use `<Link>` not `<a>`; `useParams` for stream ID; lazy loading for routes |
| State persistence evolution | §3 Zustand (Migrate) | Increment `version`; implement `migrate` function for breaking changes |
| Error boundaries | §13 Error Boundaries | Class component wrapping App; per-route boundaries; ChunkLoadError handling |
| TypeScript patterns | §14 TypeScript Strict | No `any`; type `useState` explicitly; discriminated unions for state |
| Build optimization | §15 Vite Build | Manual chunks; route-level code splitting; tree shaking with ESM imports |
| cn() utility usage | §6 Dark Mode (cn) | `clsx` for conditions + `tailwind-merge` for conflict resolution |

---

## 17. Component Dark Mode Checklist (New Component Template)

When creating any new component, apply these dark mode classes from the start:

```tsx
function NewComponent() {
  return (
    <div className={cn(
      'bg-white border-gray-200 shadow-sm',
      'dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-900/20',
    )}>
      <h2 className="text-gray-900 dark:text-gray-100">Title</h2>
      <p className="text-gray-600 dark:text-gray-400">Description</p>

      <input className={cn(
        'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
        'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500',
        'focus:ring-primary-500 dark:focus:ring-primary-400',
      )} />

      <button className={cn(
        'bg-primary-600 text-white hover:bg-primary-700',
        'dark:bg-primary-500 dark:hover:bg-primary-600',
        'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-gray-800',
      )}>
        Action
      </button>
    </div>
  );
}
```

### Six-Step Dark Mode Testing Protocol

1. Toggle twice — check no flash
2. Reload on dark — confirm persistence
3. Open every modal/dropdown/overlay — check colors apply inside
4. Check all form states (focus, disabled) — verify visibility
5. Inspect charts, images, icons — check they don't invert poorly
6. Run contrast check — verify WCAG AA on every text element

---

*End of document. Research covers the primary technology concerns identified from the codebase, specifications, and task queue.*
