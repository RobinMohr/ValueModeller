# Coding Standards — Value Modeller

## General Principles

- **Hackathon speed over perfection** — pragmatic choices, but keep code readable
- **TypeScript strict mode** — no `any` unless absolutely necessary; prefer explicit types
- **Small, focused files** — one component per file, one store per file
- **Accessibility first** — all interactive elements must be keyboard-navigable; use semantic HTML and ARIA labels

## React Conventions

- Functional components only (no class components)
- Use named exports: `export function SipocForm() { ... }`
- Props interfaces defined above the component: `interface SipocFormProps { ... }`
- Custom hooks prefixed with `use`: `useGraphStore`, `useSipocData`
- Event handlers prefixed with `handle`: `handleNodeClick`, `handleSave`
- Avoid inline styles; use Tailwind classes

## State Management (Zustand)

- One store per domain concern (e.g., `graph-store.ts`, `ui-store.ts`)
- Use immer middleware if mutations get complex
- Persist to localStorage using Zustand's `persist` middleware
- Selectors should be granular to avoid unnecessary re-renders

## Styling (Tailwind)

- Use Tailwind utility classes directly in JSX
- Extract repeated patterns into component abstractions, not custom CSS
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Responsive design: mobile-aware but desktop-first for this MVP

## TypeScript Types

- Define domain types in `src/types/`
- Use `interface` for object shapes, `type` for unions/aliases
- React Flow node data types extend the base: `Node<SipocNodeData>`
- IDs should be typed as `string` (use `crypto.randomUUID()` for generation)

## File & Folder Naming

- Files: `kebab-case.tsx` / `kebab-case.ts`
- Components: `PascalCase` in code, `kebab-case` filenames
- Stores: `domain-store.ts` (e.g., `graph-store.ts`)
- Types: `domain.types.ts` (e.g., `sipoc.types.ts`)

## Error Handling

- Wrap localStorage operations in try/catch
- Show user-friendly toast/notification on save/load errors
- Never silently swallow errors in event handlers

## Git Practices

- Commit messages: `type: short description` (e.g., `feat: add sipoc form panel`)
- Feature branches: `feature/short-description`
- Keep commits small and focused during the hackathon
