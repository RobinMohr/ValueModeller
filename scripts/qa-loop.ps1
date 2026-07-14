# ============================================================
# QA & Improvement Agent Loop (PowerShell version)
#
# Runs Kiro CLI in headless mode repeatedly to:
# 1. Open the app via Puppeteer and inspect it
# 2. Research improvements via web search
# 3. Write findings to IMPROVEMENTS.md
#
# Prerequisites:
#   - npm run dev must be running (http://localhost:5173)
#   - kiro CLI must be installed and authenticated
#   - Puppeteer MCP server must be configured
#
# Usage: .\scripts\qa-loop.ps1
#        .\scripts\qa-loop.ps1 -IntervalSeconds 120
# ============================================================

param(
    [int]$IntervalSeconds = 300
)

$prompt = @"
You are the QA & Improvement Research Agent for the Value Modeller app.

## STEP 0: Investigate the project for context (ALWAYS DO THIS FIRST)

Before testing or researching, read the project files to understand current state:
- Read speciifcations.md to understand the project goals and constraints
- Read tasks.md to see what has been done and what is planned
- Read src/App.tsx, src/components/canvas/flow-canvas.tsx, src/components/form/sipoc-form.tsx to understand the current implementation
- Read src/store/graph-store.ts to understand the data model
- Check if IMPROVEMENTS.md already exists and read it to avoid duplicating suggestions

## STEP 1: Visual Inspection via Puppeteer

1) Navigate to http://localhost:5173 using Puppeteer. Take a full-page screenshot.
2) Assess the current UI state: layout, colors, readability, professionalism for a demo.
3) Test key interactions:
   - Double-click a node to verify side panel opens
   - Check form fields are populated correctly
   - Click '+ Add Process' to verify a new node appears
   - Test canvas zoom/pan controls
   - Note any visual issues (alignment, spacing, truncation, contrast, responsiveness)

## STEP 2: Web Research for Improvements

Search the web for:
- 'SIPOC diagram tool UX best practices'
- 'value stream mapping tool features MVP'
- 'React Flow canvas UX patterns 2024'
- 'process modeling tool demo impressive features'

Focus on quick wins that look impressive in a live demo.

## STEP 3: Write Improvement Report

Append new improvement suggestions to IMPROVEMENTS.md in the project root (create if it doesn't exist).
Structure each run entry like this:

### Run [timestamp]

**Bugs Found:**
- ...

**Critical (must fix for demo):**
- ...

**High Impact / Low Effort (do today):**
- ...

**Nice to Have (if time permits):**
- ...

**Research Insights:**
- ...

## Constraints

- Only suggest things achievable in a 2-day hackathon by 4 people
- Do NOT suggest backend, auth, or export features (out of scope)
- Be specific: reference exact files, components, and line numbers where changes should be made
- Compare current state to best practices found online
- If you find bugs, describe reproduction steps clearly
"@

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Value Modeller - QA & Improvement Agent Loop" -ForegroundColor Cyan
Write-Host " Running every $IntervalSeconds seconds (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$iteration = 0

while ($true) {
    $iteration++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] === Iteration $iteration ===" -ForegroundColor Yellow

    try {
        kiro --no-interactive --trust-tools --prompt $prompt
    }
    catch {
        Write-Host "  ERROR: kiro command failed: $_" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "[$timestamp] Iteration $iteration complete. Sleeping ${IntervalSeconds}s..." -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds $IntervalSeconds
}
