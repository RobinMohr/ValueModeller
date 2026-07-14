# Value Modeller

A web application for product owners to visualize and enter SIPOC process chains for value stream modelling. Users model branching and merging processes on an interactive canvas, with structured form-based data entry for each process node.

## Quick Start

```bash
npm install
npm run dev       # Start the Vite dev server at http://localhost:5173
npm run build     # Production build (tsc + vite build)
npm run preview   # Preview the production build
```

---

## TecFactory — Agent Monitor

The project includes **TecFactory**, a WebSocket-based web UI for monitoring and controlling the autonomous agent loops from a single dashboard.

### Running the Agent Monitor

```bash
cd agent-monitor
npm install
npm start         # Start at http://localhost:3500
# or with auto-reload:
npm run dev
```

Open `http://localhost:3500` in a browser. The UI shows all configured agents with start/stop controls, live output streaming, and a task queue view.

### Agent Configuration

Agents are defined in `agent-monitor/agents.json`. Each entry specifies a command to spawn:

```json
[
  {
    "id": "dev-loop",
    "name": "Dev Loop Agent",
    "command": "powershell",
    "args": ["-File", "scripts/dev-loop.ps1"],
    "cwd": "c:\\Projects\\1_Work\\Hackathon\\Value Modeller\\ValueModeller",
    "description": "Runs the development loop automation"
  },
  {
    "id": "qa-loop",
    "name": "QA Loop Agent",
    "command": "powershell",
    "args": ["-File", "scripts/qa-loop.ps1"],
    "cwd": "c:\\Projects\\1_Work\\Hackathon\\Value Modeller\\ValueModeller",
    "description": "Runs the QA/testing loop automation"
  }
]
```

### Features

- **Real-time output** — WebSocket streams stdout/stderr from each agent to the browser
- **Start/Stop** — Launch or kill agents from the UI
- **Task Queue** — REST API at `/api/tasks` manages JSON task files in the `tasks/` folder; changes on disk are auto-detected and broadcast to connected clients
- **Multi-client** — Multiple browser tabs stay in sync via WebSocket broadcast

---

## AI Agent Loops

Three autonomous agent loops use `kiro-cli` to continuously improve the app. They run as PowerShell scripts (can be launched from TecFactory or directly in a terminal).

| Agent | Script | What it does |
|-------|--------|--------------|
| **QA Agent** | `scripts/qa-loop.ps1` | Tests the running app with Puppeteer, researches best practices, writes improvement ideas to `IMPROVEMENTS.md` |
| **Developer Agent** | `scripts/dev-loop.ps1` | Picks the top item from `IMPROVEMENTS.md`, implements it, logs the change to `release_notes.md` |
| **Task Order Agent** | `scripts/task-order-loop.ps1` | Re-evaluates task priorities in `tasks/` every 15 minutes based on current project state |

### Prerequisites

| Requirement | Why |
|---|---|
| `kiro-cli` installed and authenticated (`kiro-cli login`) | The loops spawn kiro-cli as a subprocess |
| Node.js 20+ | Required by the scripts and agent-monitor |
| `npm run dev` running in a separate terminal | The QA agent tests the app via Puppeteer at `http://localhost:5173` |
| Puppeteer MCP server configured in `.kiro/settings/mcp.json` | QA agent uses Puppeteer to interact with the UI |

---

### Running Agents Directly (PowerShell)

#### QA Agent Loop

```powershell
cd "c:\Projects\1_Work\Hackathon\Value Modeller\ValueModeller"

# Run with defaults (30s interval, 600s timeout)
.\scripts\qa-loop.ps1

# Custom options
.\scripts\qa-loop.ps1 -IntervalSeconds 60 -TimeoutSeconds 300 -MaxIterations 5
```

#### Developer Agent Loop

```powershell
cd "c:\Projects\1_Work\Hackathon\Value Modeller\ValueModeller"

# Run with defaults (0s interval, 900s timeout)
.\scripts\dev-loop.ps1

# Custom options
.\scripts\dev-loop.ps1 -IntervalSeconds 10 -MaxIterations 3 -WaitWhenEmpty 120
```

#### Task Ordering Agent Loop

```powershell
cd "c:\Projects\1_Work\Hackathon\Value Modeller\ValueModeller"

# Run with defaults (15 min interval, 300s timeout)
.\scripts\task-order-loop.ps1

# Custom options
.\scripts\task-order-loop.ps1 -IntervalSeconds 600 -MaxIterations 5
```

---

### CLI Options (PowerShell Scripts)

| Flag | QA Default | Dev Default | Task Order Default | Description |
|------|-----------|-------------|-------------------|-------------|
| `-IntervalSeconds` | 30 | 0 | 900 | Seconds between iterations |
| `-TimeoutSeconds` | 600 | 900 | 300 | Max seconds per agent invocation |
| `-MaxIterations` | 0 (infinite) | 0 (infinite) | 0 (infinite) | Stop after N iterations |
| `-WaitWhenEmpty` | — | 60 | — | Seconds to wait when `IMPROVEMENTS.md` is empty |

### Stopping the Loops

- Press **Ctrl+C** for graceful shutdown (finishes current iteration)

---

### Alternative: TypeScript ACP Scripts

The `scripts/` folder also contains TypeScript versions that use the `@agentclientprotocol/sdk` for structured agent communication:

```bash
cd scripts
npm install
npm run build     # Compile TypeScript to scripts/dist/

npm run qa        # QA loop (continuous)
npm run qa:once   # Single QA iteration
npm run dev       # Dev loop (continuous)
npm run dev:once  # Single dev iteration
```

These provide the same functionality as the PowerShell scripts but with ACP protocol support.

---

### Recommended Workflow

Run all components in separate terminals (or use TecFactory to manage agents):

```
Terminal 1:  npm run dev                              ← Vite dev server (http://localhost:5173)
Terminal 2:  cd agent-monitor && npm start            ← TecFactory agent monitor (http://localhost:3500)
Terminal 3:  .\scripts\qa-loop.ps1                    ← QA agent (or start from TecFactory)
Terminal 4:  .\scripts\dev-loop.ps1                   ← Developer agent (or start from TecFactory)
Terminal 5:  .\scripts\task-order-loop.ps1            ← Task ordering agent (optional)
```

The QA agent discovers issues and writes them to `IMPROVEMENTS.md`. The developer agent picks them up and implements fixes automatically. The task order agent keeps priorities aligned with the current project state.

---

## Project Structure

```
src/
├── components/
│   ├── canvas/        # React Flow canvas, custom nodes, custom edges
│   ├── form/          # SIPOC detail form / side panel
│   ├── landing/       # Landing page
│   ├── layout/        # App shell, header, sidebar containers
│   └── ui/            # Shared UI primitives (buttons, inputs, etc.)
├── store/             # Zustand stores (graph, UI, history, value-stream)
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
├── utils/             # Helper functions
├── App.tsx
├── main.tsx
└── index.css

scripts/                # Agent loop scripts (PowerShell + TypeScript ACP)
agent-monitor/          # TecFactory — agent management web UI
tasks/                  # Task queue (JSON files, managed by TecFactory)
.kiro/agents/           # Kiro agent definitions (QA, developer, task-order)
.kiro/steering/         # Kiro steering files
```

## Tech Stack

- React 18 + TypeScript
- React Flow via `@xyflow/react` (node-based canvas)
- Zustand (state management with localStorage persistence)
- Tailwind CSS
- Vite
- react-router-dom (routing)
- dagre (auto-layout)
