@echo off
REM ============================================================
REM QA & Improvement Agent Loop
REM 
REM Runs Kiro CLI in headless mode repeatedly to:
REM 1. Open the app via Puppeteer and inspect it
REM 2. Research improvements via web search
REM 3. Write findings to IMPROVEMENTS.md
REM
REM Prerequisites:
REM   - npm run dev must be running (http://localhost:5173)
REM   - kiro CLI must be installed and authenticated
REM   - Puppeteer MCP server must be configured
REM
REM Usage: scripts\qa-loop.bat
REM ============================================================

set INTERVAL_SECONDS=300
set ITERATION=0

echo ============================================================
echo  Value Modeller - QA ^& Improvement Agent Loop
echo  Running every %INTERVAL_SECONDS% seconds (Ctrl+C to stop)
echo ============================================================
echo.

:loop
set /a ITERATION+=1
echo [%date% %time%] === Iteration %ITERATION% ===

kiro --no-interactive --trust-tools --prompt "You are the QA & Improvement Research Agent for the Value Modeller app. ALWAYS START by reading project files for context: speciifcations.md, tasks.md, src/App.tsx, src/components/canvas/flow-canvas.tsx, src/components/form/sipoc-form.tsx, src/store/graph-store.ts, and IMPROVEMENTS.md (if it exists). Then: 1) Navigate to http://localhost:5173 using Puppeteer. Take a full-page screenshot. 2) Test key interactions: double-click a node to verify side panel opens, check form fields, click Add Process, test zoom/pan. Note visual issues. 3) Search the web for 'SIPOC diagram tool UX best practices', 'value stream mapping tool features MVP', 'React Flow canvas UX patterns 2024'. 4) Append findings to IMPROVEMENTS.md with a timestamp header. Group by: Bugs Found, Critical (for demo), High Impact/Low Effort, Nice to Have, Research Insights. Be specific: reference exact files and components. Only suggest things achievable in 2-day hackathon by 4 people. Do NOT suggest backend, auth, or export."

echo.
echo [%date% %time%] Iteration %ITERATION% complete. Sleeping %INTERVAL_SECONDS%s...
echo.
timeout /t %INTERVAL_SECONDS% /nobreak
goto loop
