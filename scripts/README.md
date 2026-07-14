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
.\scripts\qa-loop.ps1                       # Default: runs every 5 minutes
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

### Stopping

Press `Ctrl+C` to stop the loop.
