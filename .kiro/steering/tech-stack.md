# Technology Stack — Value Modeller

## Chosen Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Frontend framework | **React 18+** with TypeScript | Widely known, strong ecosystem, good for hackathon velocity |
| Diagram library | **React Flow** | Purpose-built for node-based editors in React; handles drag, zoom, pan, edges out of the box |
| State management | **Zustand** | Minimal boilerplate, works great with React Flow, easy to persist |
| Styling | **Tailwind CSS** | Rapid UI development, consistent design, utility-first |
| Build tool | **Vite** | Fast dev server, instant HMR, minimal config |
| Persistence | **localStorage** via Zustand persist middleware | Simplest path for MVP; no backend needed |
| Package manager | **npm** | Standard, no extra setup |

## Project Structure

```
src/
├── components/
│   ├── canvas/        # React Flow canvas, custom nodes, custom edges
│   ├── form/          # SIPOC detail form / side panel
│   ├── layout/        # App shell, header, sidebar containers
│   └── ui/            # Shared UI primitives (buttons, inputs, etc.)
├── store/             # Zustand stores (graph state, UI state)
├── types/             # TypeScript type definitions
├── utils/             # Helper functions
├── App.tsx
├── main.tsx
└── index.css
```

## Key Libraries

- `reactflow` — canvas rendering, node/edge management
- `zustand` — state management with persist middleware
- `@types/react` — TypeScript support
- `tailwindcss` — utility-first CSS

## Development Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build locally
```

## Conventions

- All components are functional components with TypeScript
- Use named exports (not default exports) for components
- File names use kebab-case (e.g., `sipoc-form.tsx`)
- Type files use `.ts` extension, component files use `.tsx`
