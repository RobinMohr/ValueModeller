# Research: Coding Guidelines & Standard Practices for Value Modeller

**Last Updated:** 2026-07-15T12:00:50+02:00

---

## Summary

This document collects coding guidelines, best practices, and standard patterns relevant to the Value Modeller repository. Research is organized by the key technologies in the stack: React Flow, Zustand, Vitest/React Testing Library, Tailwind CSS dark mode, TypeScript, and accessibility (WCAG). Findings are prioritized by relevance to current and future tasks in the project.

---

## 1. React Flow (@xyflow/react) — Performance & Patterns

**Relevance: HIGH** — Core rendering library; multiple tasks involve edge memoization, smart routing, node grouping

### Key Guidelines (from official docs)

| Practice | Why |
|----------|-----|
| **Memoize all custom node and edge components** with `React.memo` | Prevents re-renders during drag/pan/zoom |
| **Memoize all handler functions** with `useCallback` | Avoids new function references on every render |
| **Memoize arrays/objects** (`defaultEdgeOptions`, `snapGrid`) with `useMemo` | Prevents unnecessary re-renders from reference changes |
| **Avoid accessing the full `nodes` array** inside custom node components | The `nodes` array changes on every drag; accessing it causes all nodes to re-render |
| **Use `useNodesData` hook** for targeted data access | Only triggers re-render when specific node data changes |
| **Collapse hidden nodes** for large trees | Use `hidden` property to toggle visibility dynamically |
| **Simplify CSS on nodes** — avoid animations, shadows, gradients at scale | Complex CSS can bottleneck rendering with many nodes |

### State Management Pattern with Zustand (React Flow recommended)

```typescript
// Official pattern: Zustand store holds nodes, edges, and handlers
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

// Close on pane click
const onPaneClick = useCallback(() => setMenu(null), [setMenu]);
```

Key points:
- Use `onNodeContextMenu` prop on `<ReactFlow>`
- Prevent native context menu with `event.preventDefault()`
- Calculate position relative to pane bounds to avoid off-screen menus
- Close menu on `onPaneClick`

### Copy/Paste Pattern

- React Flow has an official "Copy and Paste" example (Pro feature)
- Key implementation steps:
  1. Listen for Ctrl+C/V keyboard events (use `useKeyPress` hook or global listener)
  2. On copy: store selected nodes + internal edges in a clipboard buffer (React state or ref)
  3. On paste: deep-clone nodes with new IDs, offset positions by ~50px, remap edge source/target to new IDs
  4. Use `crypto.randomUUID()` for new IDs (project already uses `generateId()`)
  5. Add cloned nodes/edges to the store

### Accessibility in React Flow (v12+)

- Built-in keyboard controls: Enter/Space to select a node, arrow keys to move, Delete to remove, Escape to cancel
- React Flow supports `aria-label` configuration via `AriaLabelConfig` type
- For screen readers: nodes are rendered as focusable elements with ARIA descriptions
- Custom nodes should include proper ARIA attributes for interactive elements within them
- The `colorMode` prop handles internal dark/light styling automatically

**Sources:**
- https://reactflow.dev/learn/advanced-use/performance (Relevance: HIGH)
- https://reactflow.dev/learn/advanced-use/state-management (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/context-menu (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/copy-paste (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/undo-redo (Relevance: HIGH)
- https://www.synergycodes.com/webbook/guide-to-optimize-react-flow-project-performance (Relevance: HIGH)
- https://www.synergycodes.com/blog/building-usable-and-accessible-diagrams-with-react-flow (Relevance: MEDIUM)

---

## 2. Zustand State Management — Best Practices

**Relevance: HIGH** — Primary state management; persist middleware, store testing, and performance are all active concerns

### Store Design Patterns

| Pattern | Description |
|---------|-------------|
| **One store per domain** | Separate graph state from UI state from value-stream state (already followed) |
| **`subscribeWithSelector` middleware** | Prevents full-store re-renders; enables granular subscriptions (already used) |
| **`partialize` in persist** | Only persist what's necessary — skip derived state, UI state |
| **Custom storage adapters** | For robust error handling around localStorage limitations |
| **Debounced auto-save** | The 500ms debounce pattern used in graph-store is appropriate |

### Zustand v5 Specifics

- No more curried `create` — use `create<Type>()((set, get) => ({...}))` (already followed)
- Selectors should be as granular as possible to avoid unnecessary re-renders
- For derived state, use selectors over computed values in the store

### Persist Middleware — Robust Error Handling

The project uses `zustand/persist` with `localStorage`. Key guidelines:

```typescript
// Safe custom storage adapter pattern
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.error('Storage read error:', e);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded');
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  },
};
```

**localStorage limits:**
- 5 MiB per origin (most browsers)
- `QuotaExceededError` (DOM Exception 22) is thrown on overflow
- Always wrap `setItem()` in try/catch
- Implement LRU cleanup or size monitoring for growing data
- Consider showing user-facing notifications when storage fails

**Sources:**
- https://zustand.docs.pmnd.rs/learn/guides/testing (Relevance: HIGH)
- https://docs.bswen.com/blog/2026-04-07-fix-quotaexceedederror-localstorage/ (Relevance: HIGH)
- https://beyondthecode.medium.com/zustand-middleware-the-architectural-core-of-scalable-state-management-d8d1053489ac (Relevance: MEDIUM)

---

## 3. Undo/Redo with Zundo Middleware

**Relevance: HIGH** — Active task for undo/redo support; project already has a history-store.ts

### Zundo Library (< 700 bytes)

The recommended approach for Zustand undo/redo. Package: `zundo` (v2.3.0+, supports Zustand v5).

```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

interface GraphState {
  nodes: SipocNode[];
  edges: SipocEdge[];
  // ... actions
}

const useGraphStore = create<GraphState>()(
  temporal(
    (set) => ({
      nodes: [],
      edges: [],
      // ... actions
    }),
    {
      // Only track node/edge data changes, not UI state
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      // Limit history to prevent memory bloat
      limit: 50,
      // Debounce rapid changes (e.g., during drag)
      handleSet: (handleSet) =>
        throttle(handleSet, 500),
      // Only store when something actually changed
      equality: (pastState, currentState) =>
        shallow(pastState, currentState),
    }
  ),
);

// Access undo/redo
const { undo, redo, clear } = useGraphStore.temporal.getState();
```

### Key API

| Function | Description |
|----------|-------------|
| `undo(steps?)` | Go back N states (default 1) |
| `redo(steps?)` | Go forward N states (default 1) |
| `clear()` | Remove all history |
| `pause()` / `resume()` | Temporarily stop/start tracking |
| `isTracking` | Boolean flag for tracking state |

### Integration with Persist

When using both `persist` and `temporal`, wrap them correctly:
```typescript
const useStore = create<State>()(
  persist(
    temporal(
      (set) => ({ /* store */ }),
      { /* temporal options */ }
    ),
    { name: 'storage-key' }
  )
);
```

### Best Practices for This Project

1. **Partialize** — Only track `nodes` and `edges`, not UI state (selectedNodeId, isPanelOpen)
2. **Throttle** — Use `handleSet` with 500ms throttle to avoid storing every pixel of a drag
3. **Limit** — Set `limit: 50` to cap memory usage
4. **Pause during bulk operations** — Call `pause()` before auto-layout, `resume()` after
5. **Keyboard shortcuts** — Ctrl+Z for undo, Ctrl+Shift+Z (or Ctrl+Y) for redo

**Sources:**
- https://github.com/charkour/zundo (Relevance: HIGH)
- https://www.npmjs.com/package/zundo (Relevance: HIGH)
- https://reactflow.dev/examples/interaction/undo-redo (Relevance: HIGH)



---

## 4. Testing with Vitest + React Testing Library

**Relevance: HIGH** — Multiple tasks for unit tests; existing tests use Vitest with jsdom

### Project Testing Setup Checklist

| Item | Status in Project |
|------|-------------------|
| `vitest` configured with `globals: true` | ✅ Yes |
| `jsdom` environment | ✅ Yes (in vitest.config.ts) |
| `@testing-library/react` installed | ✅ Yes |
| `@testing-library/jest-dom` installed | ✅ Yes |
| Setup file with jest-dom matchers | ⚠️ Not verified — should have `import '@testing-library/jest-dom/vitest'` |
| `window.matchMedia` mock | ⚠️ Needed for dark mode tests |
| `ResizeObserver` mock | ⚠️ Needed for React Flow component tests |

### Testing Zustand Stores (Recommended Pattern)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../store/graph-store';

describe('GraphStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    const { setState } = useGraphStore;
    setState({ nodes: [], edges: [], activeStreamId: null });
  });

  it('should add a node at the specified position', () => {
    // Arrange
    const position = { x: 100, y: 200 };

    // Act
    const id = useGraphStore.getState().addNode(position);

    // Assert
    const nodes = useGraphStore.getState().nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].position).toEqual(position);
    expect(nodes[0].id).toBe(id);
  });
});
```

**Key principle:** Zustand stores can be tested directly via `getState()` and `setState()` without rendering React components — this is faster and more focused than using `renderHook`.

### Testing TecFactory (Express + Supertest + Vitest ESM)

```javascript
// TecFactory uses ESM (.mjs test files)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Tasks REST API', () => {
  let request, app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    const mod = await import('../server.js');
    request = supertest.default;
    app = mod.app;
  });

  it('should return tasks list', async () => {
    // Arrange — nothing needed for GET

    // Act
    const response = await request(app).get('/api/tasks');

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

Key patterns for Express + ESM testing:
- Export `app` separately from `server.listen()` so Supertest can use it without starting HTTP
- Use dynamic `import()` in `beforeAll` for ESM compatibility
- Use `.mjs` extension for test files in ESM projects
- Clean up temp files in `afterAll` for tests that create data

### React Testing Library Query Priority

1. `getByRole` — Best for accessibility (buttons, inputs, headings)
2. `getByLabelText` — For form fields with labels
3. `getByPlaceholderText` — Inputs with placeholder text
4. `getByText` — Non-interactive text content
5. `getByDisplayValue` — Filled form fields
6. `getByTestId` — Last resort

### Best Practices

- **Use `userEvent.setup()`** over `fireEvent` for realistic user interaction simulation
- **Use `waitFor` or `findBy*`** for async operations — never rely on synchronous queries for async state
- **Mock sparingly** — only mock external dependencies (APIs, timers), not internal modules
- **One logical assertion per test** — multiple `expect()` calls verifying one concept is fine
- **Clean up** — Vitest with globals handles React Testing Library cleanup automatically
- **Avoid snapshot abuse** — prefer explicit assertions over brittle snapshots
- **AAA principle** — Always structure tests as Arrange → Act → Assert with comments

**Sources:**
- https://zustand.docs.pmnd.rs/learn/guides/testing (Relevance: HIGH)
- https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view (Relevance: HIGH)
- https://medium.com/@samueldeveloper/react-testing-library-vitest-the-mistakes-that-haunt-developers (Relevance: HIGH)
- https://moldstud.com/articles/p-getting-started-with-supertest-a-comprehensive-guide-to-unit-testing-for-expressjs (Relevance: MEDIUM)
- https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies (Relevance: MEDIUM)

---

## 5. Accessibility (WCAG 2.1 AA)

**Relevance: HIGH** — Multiple accessibility tasks in queue; project steering mandates a11y compliance

### Modal/Dialog Pattern

All modal dialogs must implement:

1. `role="dialog"` on the modal container
2. `aria-modal="true"` to indicate background is inert
3. `aria-labelledby` pointing to the dialog title
4. **Focus trapping** — Tab cycles within the modal only
5. **Focus restoration** — On close, focus returns to the trigger element
6. **Escape key** closes the dialog
7. Prefer native `<dialog>` element when possible (widely supported since 2022)

```tsx
// Focus trap hook pattern
function useFocusTrap(containerRef: RefObject<HTMLElement>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const focusable = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    first?.focus();
    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
}
```

### Motion Sensitivity (prefers-reduced-motion)

```css
@media (prefers-reduced-motion: reduce) {
  .react-flow__edge.animated path {
    animation: none !important;
    stroke-dasharray: none !important;
  }
  .transition-transform {
    transition: none !important;
  }
}
```

### Keyboard Navigation for Canvas

- React Flow v12 has built-in keyboard controls (arrow keys for node movement, Enter/Space to select)
- Custom additions should supplement, not override, built-in behavior
- `Tab` should cycle through interactive elements within a selected node
- Custom graph keyboard nav (as in `use-graph-keyboard-nav.ts`) should be documented with visible hints

### WCAG 2.1 AA Key Requirements for SPAs

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 2.1.1 Keyboard | All functionality available via keyboard | Tab navigation, Enter/Space activation |
| 2.4.3 Focus Order | Focus order preserves meaning | Logical tab order in forms and panels |
| 2.4.7 Focus Visible | Focus indicator always visible | Tailwind `focus:ring-*` classes |
| 4.1.2 Name, Role, Value | Custom controls have ARIA labels | `aria-label`, `role` attributes |
| 1.4.3 Contrast | 4.5:1 ratio for text | Verified in both light/dark modes |
| 2.5.1 Pointer Gestures | No multipoint gestures required | Single-click alternatives for all actions |

**Sources:**
- https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/ (Relevance: HIGH)
- https://www.synergycodes.com/blog/building-usable-and-accessible-diagrams-with-react-flow (Relevance: HIGH)
- https://www.allaccessible.org/blog/react-accessibility-best-practices-guide (Relevance: MEDIUM)
- https://rtcamp.com/handbook/react-best-practices/accessibility/ (Relevance: MEDIUM)
- https://www.w3.org/TR/WCAG21/ (Relevance: MEDIUM)
