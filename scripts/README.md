# Scripts

## qa-loop.ps1 / qa-loop.bat

Runs the QA & Improvement Research Agent in a loop using Kiro CLI headless mode.

### Prerequisites

1. Dev server running: `npm run dev` (in a separate terminal)
2. Kiro CLI installed and authenticated (`kiro --version` to check)
3. Puppeteer MCP server configured in `~/.kiro/settings/mcp.json`

### Usage

**PowerShell:**
```powershell
.\scripts\qa-loop.ps1                       # Default: runs every 30 seconds
.\scripts\qa-loop.ps1 -IntervalSeconds 120  # Custom: every 2 minutes
```

**CMD:**
```cmd
scripts\qa-loop.bat
```

### What it does

Each iteration:
1. Opens `http://localhost:5173` via Puppeteer and takes a screenshot
2. Tests interactions (node click → side panel, add process, form editing)
3. Searches the web for SIPOC/value stream UX best practices
4. Appends new findings to `IMPROVEMENTS.md` at project root

---

## dev-loop.ps1 / dev-loop.bat

Runs the Developer Implementation Agent in a loop using Kiro CLI headless mode.

### Prerequisites

1. Dev server running: `npm run dev` (in a separate terminal)
2. Kiro CLI installed and authenticated (`kiro --version` to check)
3. `npm run build` passes without errors before starting

### Usage

**PowerShell:**
```powershell
.\scripts\dev-loop.ps1                        # Default: runs every 30s, infinite iterations
.\scripts\dev-loop.ps1 -IntervalSeconds 60    # Custom interval
.\scripts\dev-loop.ps1 -MaxIterations 5       # Stop after 5 improvements
.\scripts\dev-loop.ps1 -TimeoutSeconds 1200   # Allow 20 min per iteration
```

**CMD:**
```cmd
scripts\dev-loop.bat
```

### What it does

Each iteration:
1. Reads `IMPROVEMENTS.md` and picks the highest-priority item
2. Implements the change in code (one item per iteration)
3. Runs `npm run build` to verify no errors
4. Removes the completed item from `IMPROVEMENTS.md`
5. Appends a timestamped entry to `release_notes.md`

### Priority order

The agent picks items in this order:
1. **Critical (Must Fix for Demo)** — showstopper fixes
2. **High Impact / Low Effort** — quick wins
3. **Bugs Found** — functional issues
4. **Nice to Have** — polish items

### Stopping

- Press `Ctrl+C` to stop manually
- The loop auto-stops if `IMPROVEMENTS.md` has no remaining actionable items
- Use `-MaxIterations` to limit the number of runs

---

## Workflow: QA + Dev Loop Together

For maximum productivity, run both agents in parallel:

```powershell
# Terminal 1 — Dev server
npm run dev

# Terminal 2 — QA agent finds improvements
.\scripts\qa-loop.ps1 -IntervalSeconds 300

# Terminal 3 — Dev agent implements them
.\scripts\dev-loop.ps1 -IntervalSeconds 60
```

The QA agent feeds `IMPROVEMENTS.md`, the Dev agent consumes it. `release_notes.md` tracks what was shipped.
