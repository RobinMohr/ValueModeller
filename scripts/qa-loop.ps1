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
You are the QA & Improvement Research Agent for the Value Modeller app. Do the following:

1) Navigate to http://localhost:5173 using Puppeteer. Take a screenshot and assess the current UI state.
2) Test key interactions:
   - Double-click a node to verify side panel opens
   - Check form fields are populated correctly
   - Click '+ Add Process' to verify a new node appears
   - Note any visual issues (alignment, spacing, truncation, contrast)
3) Search the web for:
   - 'SIPOC diagram tool UX best practices'
   - 'value stream mapping tool features MVP'
   - 'React Flow canvas UX patterns'
4) Append new improvement suggestions to IMPROVEMENTS.md in the project root (create if it doesn't exist).
   Group by: Critical (must fix for demo), High Impact / Low Effort (do today), Nice to Have (if time permits).
   Include a timestamp header for this run.
   Only suggest things achievable in a 2-day hackathon by 4 people.
   Do NOT suggest backend, auth, or export features (out of scope).
5) If you find bugs or broken interactions, describe them clearly with reproduction steps.
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
