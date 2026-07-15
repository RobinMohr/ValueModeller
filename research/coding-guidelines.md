# Research: Coding Guidelines & Standard Practices for Value Modeller

**Last Updated:** 2026-07-15T11:57:34+02:00

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

### Accessibility in React Flow (v12+)

- Built-in keyboard controls: Enter/Space to select a node, arrow keys to move, Delete to remove, Escape to cancel
- React Flow supports `aria-label` configuration via `AriaLabelConfig` type
- For screen readers: nodes are rendered as focusable elements with ARIA descriptions
- Custom nodes should include proper ARIA attributes for interactive elements within them

**Sources:**
- https://reactflow.dev/learn/advanced-use/performance (Relevance: HIGH)
- https://reactflow.dev/learn/advanced-use/state-management (Relevance: HIGH)
- https://www.synergycodes.com/blog/guide-to-optimize-react-flow-project-performance (Relevance: HIGH)
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
        // Notify user, attempt cleanup, or fallback
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
- https://gist.github.com/ctrlShiftBryan/633b2e99cb0f62fbdde1c41858950283 (Relevance: MEDIUM)
- https://beyondthecode.medium.com/zustand-middleware-the-architectural-core-of-scalable-state-management-d8d1053489ac (Relevance: MEDIUM)

---

## 3. Testing with Vitest + React Testing Library

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
import { act } from '@testing-library/react';
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

### React Testing Library Query Priority

1. `getByRole` — Best for accessibility (buttons, inputs, headings)
2. `getByLabelText` — For form fields with labels
3. `getByPlaceholderText` — Inputs with placeholder text
4. `getByText` — Non-interactive text content
5. `getByDisplayValue` — Filled form fields
6. `getByTestId` — Last resort

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';

it('should update state when action is called', () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.someAction();
  });

  expect(result.current.someValue).toBe(expected);
});
```

### Best Practices

- **Use `userEvent.setup()`** over `fireEvent` for realistic user interaction simulation
- **Use `waitFor` or `findBy*`** for async operations — never rely on synchronous queries for async state
- **Mock sparingly** — only mock external dependencies (APIs, timers), not internal modules
- **One logical assertion per test** — multiple `expect()` calls verifying one concept is fine
- **Clean up** — Vitest with globals handles React Testing Library cleanup automatically
- **Avoid snapshot abuse** — prefer explicit assertions over brittle snapshots

**Sources:**
- https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view (Relevance: HIGH)
- https://zustand.docs.pmnd.rs/learn/guides/testing (Relevance: HIGH)
- https://gist.github.com/mustafadalga/475769fcb77b08a813bf5dae0a145027 (Relevance: MEDIUM)
- https://www.thisdot.co/blog/how-to-test-react-custom-hooks-and-components-with-vitest (Relevance: MEDIUM)

---

## 4. Accessibility (WCAG 2.1 AA)

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
  /* Also disable transitions on side panels */
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

**Sources:**
- https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/ (Relevance: HIGH)
- https://www.synergycodes.com/blog/building-usable-and-accessible-diagrams-with-react-flow (Relevance: HIGH)
- https://www.allaccessible.org/blog/react-accessibility-best-practices-guide (Relevance: MEDIUM)
- https://clhenrick.io/blog/react-a11y-modal-dialog/ (Relevance: MEDIUM)

---

## 5. Tailwind CSS — Dark Mode & Styling Patterns

**Relevance: HIGH** — Many tasks involve fixing missing dark mode styles

### Dark Mode Strategy (class-based, already used)

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Toggle via class on <html> or root element
  // ...
}
```

### Checklist for Dark Mode Consistency

Every component with visible styling must have both light and dark variants:

| Element | Light | Dark |
|---------|-------|------|
| Background | `bg-white` | `dark:bg-gray-800` or `dark:bg-gray-900` |
| Text | `text-gray-900` | `dark:text-gray-100` |
| Secondary text | `text-gray-600` | `dark:text-gray-400` |
| Borders | `border-gray-200` | `dark:border-gray-600` or `dark:border-gray-700` |
| Inputs | `bg-white border-gray-300` | `dark:bg-gray-700 dark:border-gray-600` |
| Hover states | `hover:bg-gray-100` | `dark:hover:bg-gray-700` |
| Focus rings | `focus:ring-blue-500` | `dark:focus:ring-blue-400` |

### Common Mistakes (found in this project)

1. Adding light mode classes but forgetting `dark:` counterparts on the same element
2. Hardcoding colors like `text-gray-700` without dark variant — invisible on dark backgrounds
3. Missing dark mode on headings/labels in form sections
4. Not applying `dark:` to dynamically generated elements (e.g., React Flow MiniMap)

### React Flow + Dark Mode

React Flow v12 has a `colorMode` prop that handles internal styling:
```tsx
<ReactFlow colorMode={isDark ? 'dark' : 'light'} ... />
```
This is cleaner than manually overriding `.react-flow` CSS classes with Tailwind.

**Sources:**
- https://magicui.design/blog/tailwind-dark-mode (Relevance: HIGH)
- https://blog.vibecoder.me/dark-mode-implementation-web-app (Relevance: MEDIUM)
- https://tailkits.com/blog/dark-text-styling-tailwind/ (Relevance: MEDIUM)

---

## 6. TypeScript — Strict Mode Patterns

**Relevance: MEDIUM** — Project uses TypeScript strict mode; relevant for future features

### Discriminated Unions for Component Props

Useful for components that behave differently based on a mode/variant:

```typescript
type NodeType = 'sipoc' | 'group';

// Discriminated union for node-specific props
type NodeProps =
  | { type: 'sipoc'; data: SipocNodeData }
  | { type: 'group'; data: GroupNodeData };

// TypeScript narrows automatically in switch/if:
function renderNode(props: NodeProps) {
  if (props.type === 'sipoc') {
    // props.data is SipocNodeData here
  }
}
```

### Type Narrowing Best Practices

- Use `satisfies` operator for type-safe object literals while preserving narrow types
- Prefer `interface` for object shapes (extendable), `type` for unions/aliases
- Use `as const` for literal arrays that shouldn't widen
- Avoid `any` — use `unknown` + type guards for truly unknown data

### React Flow TypeScript Patterns

```typescript
import type { Node, Edge, NodeProps } from '@xyflow/react';

// Type your nodes generically
type SipocNode = Node<SipocNodeData, 'sipoc'>;

// Custom node component with proper typing
function SipocNodeComponent({ data, id }: NodeProps<SipocNode>) {
  // data is fully typed as SipocNodeData
}
```

**Sources:**
- https://oneuptime.com/blog/post/2026-01-15-typescript-discriminated-unions-react-props/view (Relevance: MEDIUM)
- https://betterstack.com/community/guides/scaling-nodejs/discriminated-unions/ (Relevance: MEDIUM)
- https://generalistprogrammer.com/tutorials/typescript-discriminated-unions-complete-guide (Relevance: MEDIUM)

---

## 7. Project-Specific Patterns (Observed from Codebase)

**Relevance: HIGH** — These patterns are already established and should be followed for consistency

### File Organization

```
src/components/{domain}/    # Grouped by feature (canvas, form, landing, layout, ui)
src/store/{domain}-store.ts # One store per domain
src/hooks/use-{name}.ts     # Custom hooks prefixed with "use-"
src/utils/{name}.ts         # Pure utility functions
src/types/{domain}.types.ts # Type definitions
src/tests/{name}.test.ts    # Test files co-located in tests/ directory
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `graph-store.ts`, `sipoc-form.tsx` |
| Components | PascalCase | `SipocNode`, `FlowCanvas` |
| Hooks | camelCase with `use` prefix | `useHelperLines`, `useFocusTrap` |
| Stores | camelCase with `use` prefix | `useGraphStore`, `useUIStore` |
| Types | PascalCase | `SipocNodeData`, `GraphState` |
| Event handlers | `handle` prefix | `handleNodeClick`, `handleSave` |

### ID Generation

Always use `crypto.randomUUID()` (via `generateId()` utility in `src/utils/id.ts`).

### State Update Pattern (Immutable)

```typescript
// Always create new references for React to detect changes:
set({
  nodes: get().nodes.map((node) =>
    node.id === targetId
      ? { ...node, data: { ...node.data, ...updates } }
      : node
  ),
});
```

### Auto-Save Subscription Pattern

```typescript
// Debounced subscription for persistence
useStore.subscribe(
  (state) => ({ relevantData }),
  ({ relevantData }) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      persistenceStore.save(relevantData);
    }, 500);
  },
  { equalityFn: shallowCompare }
);
```

---

## 8. Future Considerations (Based on Task Queue)

Based on the current task queue, these guidelines will become increasingly relevant:

| Future Feature | Relevant Guidelines |
|---------------|-------------------|
| Node context menu (right-click) | React Flow's context menu pattern; `onNodeContextMenu` handler |
| Copy/paste nodes (Ctrl+C/V) | Clipboard API; deep-clone node data with new IDs |
| Undo/redo | History store pattern; command pattern with immutable snapshots |
| Export/import JSON | Validate schema on import; sanitize user-uploaded JSON |
| Node grouping/swimlanes | React Flow sub-flows; `parentId` + `extent: 'parent'` pattern |
| Smart edge routing | Pathfinding algorithms; memoize expensive calculations |
| Proximity connect | Distance-based calculations; `useCallback` for performance |
| Unit test expansion | Cover stores first (pure logic), then utils, then components |
| Dark mode fixes | Systematic audit of all components for `dark:` variants |
| ARIA dialog semantics | Focus trap hook; `role="dialog"` + `aria-modal` on all modals |

---

## 9. Reference Links (All Sources)

| Topic | URL | Relevance |
|-------|-----|-----------|
| React Flow Performance | https://reactflow.dev/learn/advanced-use/performance | HIGH |
| React Flow State Management | https://reactflow.dev/learn/advanced-use/state-management | HIGH |
| React Flow Accessibility | https://www.synergycodes.com/blog/building-usable-and-accessible-diagrams-with-react-flow | HIGH |
| Synergy Codes RF Performance Guide | https://www.synergycodes.com/blog/guide-to-optimize-react-flow-project-performance | HIGH |
| Zustand Testing Guide | https://zustand.docs.pmnd.rs/learn/guides/testing | HIGH |
| Vitest + RTL Guide | https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view | HIGH |
| localStorage Error Handling | https://docs.bswen.com/blog/2026-04-07-fix-quotaexceedederror-localstorage/ | HIGH |
| Accessible Modals & Focus Traps | https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/ | HIGH |
| React Accessibility SPA Guide | https://www.allaccessible.org/blog/react-accessibility-best-practices-guide | MEDIUM |
| Tailwind Dark Mode | https://magicui.design/blog/tailwind-dark-mode | MEDIUM |
| TypeScript Discriminated Unions | https://betterstack.com/community/guides/scaling-nodejs/discriminated-unions/ | MEDIUM |
| Zustand Middleware Patterns | https://beyondthecode.medium.com/zustand-middleware-the-architectural-core-of-scalable-state-management-d8d1053489ac | MEDIUM |
| React Testing Custom Hooks | https://www.thisdot.co/blog/how-to-test-react-custom-hooks-and-components-with-vitest | MEDIUM |
| React a11y Modal Dialog | https://clhenrick.io/blog/react-a11y-modal-dialog/ | MEDIUM |
| Dark Mode Implementation | https://blog.vibecoder.me/dark-mode-implementation-web-app | MEDIUM |
