# Value Modeller

A web application for product owners to visualize and manage SIPOC process chains for value stream modelling. Users model branching and merging processes on an interactive canvas, with structured form-based data entry for each process node.

Built during the TecAlliance Hackathon (July 14–15, 2026) by a team of 4.

## Quick Start

```bash
npm install
npm run dev       # Start the Vite dev server at http://localhost:5173
npm run build     # Production build (tsc + vite build)
npm run preview   # Preview the production build
npm run test      # Run unit tests (vitest)
```

---

## Features

### Canvas Editor
- **Interactive node-based canvas** powered by React Flow — drag, pan, zoom
- **SIPOC nodes** displaying full Supplier/Input/Process/Output/Customer data directly on the canvas
- **Smart edge routing** — edges automatically route around intermediate nodes to avoid visual overlap
- **Proximity connect** — drag a node near another to auto-create a connection
- **Helper lines / snap-to-grid** — alignment guides appear when dragging nodes near other nodes
- **Auto-layout** — one-click dagre-based hierarchical arrangement (LR or TB direction)
- **Node grouping / swimlanes** — resizable, color-coded containers for organizing steps by team or department
- **Guided demo mode** — step-by-step walkthrough following topological order with auto-pan and auto-play
- **Node search (Ctrl+F)** — full-text search across all SIPOC fields with result navigation
- **Context menu** — right-click nodes for quick actions (edit, duplicate, delete)
- **Copy/paste/duplicate** — Ctrl+C/V/D for rapid flow building
- **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z with debounced history (max 50 snapshots)
- **Keyboard navigation** — arrow keys navigate along connections; Tab cycles nodes spatially
- **Animated edges** — dashed flow animation showing data direction (respects prefers-reduced-motion)

### SIPOC Form Panel
- **Side panel** opens on single-click of any node
- **Structured fields:** Suppliers, Inputs, Process Description, Outputs, Customers
- **Additional fields:** Applications Involved, Involved Teams, Known Issues
- **Auto-fill on connect** — connecting two nodes auto-populates the target's Inputs from the source's Outputs

### Multi-Stream Management
- **Landing page** with table view (default) and cards view toggle
- **Create / edit / delete** value streams with metadata (teams, apps, customer segments, created values, known issues)
- **Expandable detail panel** — click a stream row to preview all metadata inline without navigating
- **Stream statistics panel** — aggregated metrics (steps, connections, completion %, teams, apps, issues)

### Persistence & Safety
- **Auto-save to localStorage** with live "Saving…" / "Saved ✓" indicator
- **Safe storage adapter** — quota monitoring (warns at 90%), error toasts on write failures
- **Error boundary** — crash-safe fallback UI with "Clear data & reload" recovery option

### Theming & Accessibility
- **Dark mode** — light / dark / system toggle (persisted)
- **WCAG-compliant dialogs** — focus trapping, aria-modal, aria-labelledby, Escape dismissal
- **Skip navigation link** — screen reader users can jump to canvas
- **Keyboard shortcuts panel** — `?` button showing all available interactions
- **Node completion indicator** — colored left border (gray → blue → green) based on SIPOC fill state
- **prefers-reduced-motion** support for animated edges

### Demo Data
- **Insurance Claims Processing** — 10 nodes, 11 edges, branching/merging topology
- **Software Development Lifecycle** — 15 nodes, 18 edges, parallel branches and feedback loops

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Frontend | React 18 + TypeScript (strict mode) |
| Canvas | `@xyflow/react` (React Flow v12) |
| State | Zustand 5 with localStorage persist middleware |
| Styling | Tailwind CSS 3 (class-based dark mode) |
| Routing | react-router-dom 7 |
| Layout | `@dagrejs/dagre` (auto-layout) |
| Build | Vite 6 |
| Testing | Vitest + @testing-library/react |
| Package manager | npm |

---

## Project Structure

```
src/
├── components/
│   ├── canvas/        # React Flow canvas, custom nodes/edges, panels
│   ├── form/          # SIPOC detail form (side panel)
│   ├── landing/       # Landing page with stream management
│   ├── layout/        # App shell, stream editor, stats panel
│   └── ui/            # Shared primitives (button, input, toast, error boundary)
├── hooks/             # Custom React hooks (clipboard, context menu, focus trap, etc.)
├── store/             # Zustand stores (graph, ui, history, theme, toast, value-stream)
├── tests/             # Unit tests (Vitest)
├── types/             # TypeScript type definitions
├── utils/             # Helpers (auto-layout, edge routing, cycle detection, demo data, etc.)
├── App.tsx            # Route definitions
├── main.tsx           # Entry point with BrowserRouter + ErrorBoundary
└── index.css          # Tailwind base + custom CSS

scripts/               # Agent loop scripts (TypeScript ACP)
tecfactory/            # TecFactory — agent management web UI
tasks/                 # Task queue (JSON files, managed by TecFactory)
errors/                # Agent error reports (Markdown)
.kiro/agents/          # Kiro agent definitions
.kiro/hooks/           # Kiro automation hooks
.kiro/steering/        # Kiro steering files
```

---

## TecFactory — Agent Monitor

A WebSocket-based web UI for monitoring and controlling autonomous AI agent loops from a single dashboard.

### Running TecFactory

```bash
cd tecfactory
npm install
npm start         # Start at http://localhost:3500
npm run dev       # Start with auto-reload
npm run test      # Run unit tests (58 tests)
```

### Features

- **Real-time log streaming** — WebSocket pushes stdout/stderr from each agent to the browser
- **Start / Stop with rollback** — kill agents and optionally revert uncommitted changes + reset task states
- **Agent activity tracking** — see what each agent is working on (task title, testing status, research)
- **List and Cards views** — toggle between compact table or detailed card layout
- **Collapsible log panels** — collapse agents you're not monitoring (session-persistent)
- **Copyable logs** — click-to-copy or Ctrl+A within a log panel
- **Task queue management** — create, edit, sort, and filter tasks; AI Assist mode for task generation
- **Errors tab** — browse, view, and clear agent error reports
- **Multi-client sync** — multiple browser tabs stay synchronized via WebSocket broadcast

### Agent Types

| Agent | Purpose |
|-------|---------|
| **Developer** | Picks top task from queue, implements it, commits to `develop` branch |
| **QA** | Tests the running app with Puppeteer, creates bug/improvement tasks |
| **Task Order** | Re-prioritizes task queue based on current project state |
| **Code Reviewer** | Reviews code changes for quality and standards |
| **Information Collector** | Researches topics via web search, writes structured findings |
| **Task Creator** | Generates structured tasks from natural language prompts |

---

## AI Agent Loops

Autonomous agents use the ACP (Agent Client Protocol) to continuously improve the app. They run as TypeScript scripts via `kiro-cli`.

### Prerequisites

| Requirement | Why |
|---|---|
| `kiro-cli` installed and authenticated | Agent loops spawn kiro-cli as a subprocess |
| Node.js 20+ | Required by scripts and TecFactory |
| `npm run dev` running in a separate terminal | QA agent tests the app at `http://localhost:5173` |

### Running Agents via Scripts

```bash
cd scripts
npm install
npm run build     # Compile TypeScript

npm run qa        # QA loop (continuous)
npm run qa:once   # Single QA iteration
npm run dev       # Dev loop (continuous)
npm run dev:once  # Single dev iteration
```

### Agent Workflow

1. **QA agent** tests the app with Puppeteer, discovers issues, creates task files in `tasks/`
2. **Task order agent** re-prioritizes tasks based on severity and project state
3. **Developer agent** picks the highest-priority `todo` task, implements it, commits, and pushes to `develop`
4. **Auto-commit hook** (`.kiro/hooks/auto-commit.json`) commits changes after each Kiro session

Tasks follow a priority + origin system: user-created tasks (`origin: "user"`) are prioritized over AI-assisted (`"user-assisted"`) and fully AI-generated (`"ai"`) at the same priority level.

---

## Testing

```bash
# Value Modeller frontend (61 tests)
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# TecFactory server (58+ tests)
cd tecfactory
npm test
```

Tests cover: graph store operations, UI state, toast notifications, auto-layout, cycle detection, edge routing, class utilities.

---

## Development Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build (tsc + vite build)
npm run preview  # Preview production build locally
npm run test     # Run unit tests
```

---

## Conventions

- Functional components with TypeScript (strict mode, no `any`)
- Named exports (`export function ComponentName`)
- File names: `kebab-case.tsx` / `kebab-case.ts`
- One component per file, one store per file
- Tailwind utility classes (no custom CSS except React Flow overrides)
- `cn()` utility (clsx + tailwind-merge) for conditional classes
- Zustand stores with persist middleware for localStorage
- Semantic HTML + ARIA labels on all interactive elements
