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

kiro --no-interactive --trust-tools --prompt "You are the QA & Improvement Research Agent for the Value Modeller app. Do the following: 1) Navigate to http://localhost:5173 using Puppeteer. Take a screenshot and assess the current state. 2) Test key interactions: double-click a node, check side panel opens, verify form fields work, test Add Process button. 3) Search the web for 'SIPOC diagram tool UX best practices' and 'value stream mapping tool features'. 4) Append new improvement suggestions to IMPROVEMENTS.md in the project root (create if missing). Group suggestions by: Critical (for demo), High Impact/Low Effort, Nice to Have. Include timestamp of this run. Only suggest things achievable in a 2-day hackathon by 4 people. Do NOT suggest backend, auth, or export features."

echo.
echo [%date% %time%] Iteration %ITERATION% complete. Sleeping %INTERVAL_SECONDS%s...
echo.
timeout /t %INTERVAL_SECONDS% /nobreak
goto loop
