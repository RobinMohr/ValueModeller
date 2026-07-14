# ============================================================
# QA & Improvement Agent Loop (PowerShell)
#
# Runs kiro-cli repeatedly using the qa-improvement-agent.
# The agent definition lives at .kiro/agents/qa-improvement-agent.json
#
# Voraussetzungen:
#   - npm run dev muss in separatem Terminal laufen
#   - kiro-cli muss installiert sein
#   - Puppeteer MCP Server muss konfiguriert sein
#
# Ausfuehren:
#   cd "c:\Projects\1_Work\Hackathon\Value Modeller\ValueModeller"
#   .\scripts\qa-loop.ps1
# ============================================================

param(
    [int]$IntervalSeconds = 30,
    [int]$TimeoutSeconds = 600,
    [int]$MaxIterations = 0  # 0 = infinite
)

$ErrorActionPreference = "Continue"

$prompt = "Run the QA and Improvement Research Agent. Follow all steps in your agent instructions: read project files, test the app with Puppeteer at http://localhost:5173, research improvements via web search, and update IMPROVEMENTS.md. CRITICAL: When calling puppeteer_navigate for the FIRST time, you MUST pass launchOptions with headless mode: { ""headless"": true, ""args"": [""--no-sandbox"", ""--disable-gpu""] }. This is required for autonomous operation without a visible browser window. Do NOT add duplicate ideas to IMPROVEMENTS.md. Read the existing file first, and if an idea already exists, either skip it or extend/refine the existing entry in place. Only add genuinely new findings."

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Value Modeller - QA and Improvement Agent Loop" -ForegroundColor Cyan
Write-Host (" Interval: {0}s | Timeout: {1}s | Max: {2}" -f $IntervalSeconds, $TimeoutSeconds, $(if ($MaxIterations -eq 0) { "infinite" } else { $MaxIterations })) -ForegroundColor Cyan
Write-Host " Agent: qa-improvement-agent" -ForegroundColor Cyan
Write-Host " Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$iteration = 0

while ($true) {
    $iteration++
    $startTime = Get-Date
    $timestamp = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host ("[$timestamp] === Iteration $iteration ===") -ForegroundColor Yellow
    Write-Host ""

    # Start kiro-cli with output redirected so we can stream it AND detect completion.
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "kiro-cli"
    $psi.Arguments = ('chat --no-interactive -a --agent qa-improvement-agent "{0}"' -f $prompt)
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WorkingDirectory = (Get-Location).Path

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    $exitCode = 0
    $completed = $false

    try {
        $process.Start() | Out-Null
        Write-Host ("  PID: {0}" -f $process.Id) -ForegroundColor DarkGray

        # Read stderr in background to prevent deadlocks
        $stderrTask = $process.StandardError.ReadToEndAsync()

        # Stream stdout line by line, watching for the completion marker
        $deadline = $startTime.AddSeconds($TimeoutSeconds)

        while (-not $process.StandardOutput.EndOfStream) {
            if ((Get-Date) -gt $deadline) {
                Write-Host ""
                Write-Host "  TIMEOUT: exceeded ${TimeoutSeconds}s, killing." -ForegroundColor Red
                break
            }

            $line = $process.StandardOutput.ReadLine()
            if ($null -ne $line) {
                Write-Host $line

                # Detect the kiro-cli completion marker
                if ($line -match "Credits:.*Time:") {
                    $completed = $true
                }
            }
        }

        # Give it a moment to exit gracefully, then force-kill the process tree.
        # The MCP server (Puppeteer) often doesn't exit on its own, so we kill aggressively.
        if ($completed) {
            $gracefulExit = $process.WaitForExit(3000)
            if (-not $gracefulExit) {
                Write-Host "  kiro-cli completed. Killing process tree to release MCP servers." -ForegroundColor DarkGray
                # Kill the entire process tree (includes MCP servers, Puppeteer, etc.)
                taskkill /PID $process.Id /T /F 2>$null | Out-Null
                $process.WaitForExit(5000)
            }
            $exitCode = 0
        }
        else {
            # Timed out or stream ended without completion marker
            if (-not $process.HasExited) {
                Write-Host "  Force-killing kiro-cli (no completion marker)." -ForegroundColor Yellow
                taskkill /PID $process.Id /T /F 2>$null | Out-Null
                $process.WaitForExit(5000)
            }
            $exitCode = if ($process.HasExited) { $process.ExitCode } else { -1 }
        }

        # Print any stderr
        $stderr = $stderrTask.Result
        if ($stderr -and $stderr.Trim()) {
            Write-Host ("  STDERR: " + $stderr) -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Host ("  ERROR: " + $_) -ForegroundColor Red
        $exitCode = 1
        if ($process -and -not $process.HasExited) {
            taskkill /PID $process.Id /T /F 2>$null | Out-Null
        }
    }
    finally {
        if ($process) { $process.Dispose() }
    }

    # Clean up any orphaned Puppeteer/Chromium/Edge processes started during this iteration
    $browserNames = @("chrome", "chromium", "msedge", "headless_shell")
    $chromeProcs = Get-Process -Name $browserNames -ErrorAction SilentlyContinue |
        Where-Object { $_.StartTime -ge $startTime }
    if ($chromeProcs) {
        foreach ($cp in $chromeProcs) {
            Write-Host ("  Killing orphaned browser process: {0} (PID: {1})" -f $cp.ProcessName, $cp.Id) -ForegroundColor DarkGray
            Stop-Process -Id $cp.Id -Force -ErrorAction SilentlyContinue
        }
    }

    $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
    $endTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Host ""
    if ($exitCode -ne 0) {
        Write-Host ("  WARNING: Exit-Code $exitCode (Duration: ${duration}s)") -ForegroundColor Red
    }
    else {
        Write-Host ("[$endTimestamp] Iteration $iteration done. (Duration: ${duration}s)") -ForegroundColor Green
    }

    Write-Host ""
    if ($MaxIterations -gt 0 -and $iteration -ge $MaxIterations) {
        Write-Host "  Max iterations ($MaxIterations) reached. Stopping." -ForegroundColor Cyan
        break
    }
    Write-Host ("  Next iteration in {0}s... (Ctrl+C to stop)" -f $IntervalSeconds) -ForegroundColor Gray
    Start-Sleep -Seconds $IntervalSeconds
    Write-Host ""
}
