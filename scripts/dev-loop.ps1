# ============================================================
# Developer Implementation Agent Loop (PowerShell)
#
# Runs kiro-cli repeatedly using the developer-agent.
# Each iteration:
#   - Agent picks the single most important item from IMPROVEMENTS.md
#   - Implements it, removes it from IMPROVEMENTS.md, logs to release_notes.md
#   - Agent closes itself after ONE task
#   - This loop waits briefly, then starts the agent again for the next task
#
# If IMPROVEMENTS.md is empty, the loop waits and retries.
#
# Prerequisites:
#   - npm run dev should be running in a separate terminal
#   - kiro-cli must be installed and authenticated
#   - npm run build must pass before starting
#
# Usage:
#   cd "c:\Projects\1_Work\Hackathon\Value Modeller\ValueModeller"
#   .\scripts\dev-loop.ps1
#   .\scripts\dev-loop.ps1 -IntervalSeconds 10 -MaxIterations 5
#   .\scripts\dev-loop.ps1 -WaitWhenEmpty 120
# ============================================================

param(
    [int]$IntervalSeconds = 10,
    [int]$WaitWhenEmpty = 60,
    [int]$TimeoutSeconds = 900,
    [int]$MaxIterations = 0  # 0 = infinite
)

$ErrorActionPreference = "Continue"

$prompt = @"
You are the Developer Implementation Agent. Do exactly ONE task and then stop.
1) Read IMPROVEMENTS.md. If it has no actionable items, say 'No actionable items' and exit.
2) Pick the SINGLE most important item (Critical > High Impact/Low Effort > Bugs > Nice to Have).
3) Read relevant source files, implement the change.
4) Run 'npm run build' to verify.
5) Remove the completed item from IMPROVEMENTS.md (all occurrences).
6) Append a timestamped entry to release_notes.md.
7) STOP. Do not pick another task. Exit immediately after completing one item.
"@

Write-Host "============================================================" -ForegroundColor Green
Write-Host " Value Modeller - Developer Implementation Agent Loop" -ForegroundColor Green
Write-Host (" Interval: {0}s | Wait-when-empty: {1}s | Timeout: {2}s | Max: {3}" -f $IntervalSeconds, $WaitWhenEmpty, $TimeoutSeconds, $(if ($MaxIterations -eq 0) { "infinite" } else { $MaxIterations })) -ForegroundColor Green
Write-Host " Agent: developer-agent" -ForegroundColor Green
Write-Host " Press Ctrl+C to stop" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

$iteration = 0

while ($true) {
    # Pre-check: is IMPROVEMENTS.md empty or missing?
    $improvementsFile = Join-Path (Get-Location).Path "IMPROVEMENTS.md"
    $hasWork = $false

    if (Test-Path $improvementsFile) {
        $content = Get-Content $improvementsFile -Raw
        # Check if there's any substantive content beyond headers
        $stripped = $content -replace "(?m)^#+.*$", "" -replace "\s+", ""
        if ($stripped.Length -gt 20) {
            $hasWork = $true
        }
    }

    if (-not $hasWork) {
        Write-Host ("[{0}] IMPROVEMENTS.md is empty or missing. Waiting {1}s before retrying..." -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $WaitWhenEmpty) -ForegroundColor DarkYellow
        Start-Sleep -Seconds $WaitWhenEmpty
        continue
    }

    $iteration++
    $startTime = Get-Date
    $timestamp = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host ("[$timestamp] === Task $iteration ===") -ForegroundColor Yellow

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "kiro-cli"
    $psi.Arguments = ('chat --no-interactive -a --agent developer-agent "{0}"' -f ($prompt -replace "`n", " " -replace '"', '\"'))
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WorkingDirectory = (Get-Location).Path

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    try {
        $process.Start() | Out-Null

        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()

        $exited = $process.WaitForExit($TimeoutSeconds * 1000)

        if (-not $exited) {
            Write-Host "  TIMEOUT: kiro-cli exceeded ${TimeoutSeconds}s, killing process." -ForegroundColor Red
            $process.Kill()
            $process.WaitForExit(5000)
        }

        $stdout = $stdoutTask.Result
        $stderr = $stderrTask.Result

        if ($stdout) { Write-Host $stdout }
        if ($stderr -and $stderr.Trim()) { Write-Host ("  STDERR: " + $stderr) -ForegroundColor DarkGray }

        $exitCode = $process.ExitCode
    }
    catch {
        Write-Host ("  ERROR starting kiro-cli: " + $_) -ForegroundColor Red
        $exitCode = 1
    }
    finally {
        if ($process) { $process.Dispose() }
    }

    $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
    $endTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    if ($exitCode -ne 0) {
        Write-Host ("[$endTimestamp] WARNING: Exit-Code $exitCode (Duration: ${duration}s)") -ForegroundColor Red
    }
    else {
        Write-Host ("[$endTimestamp] Task $iteration completed. (Duration: ${duration}s)") -ForegroundColor Green
    }

    # Check for max iterations
    if ($MaxIterations -gt 0 -and $iteration -ge $MaxIterations) {
        Write-Host ""
        Write-Host "  Max iterations ($MaxIterations) reached. Stopping." -ForegroundColor Cyan
        break
    }

    # Brief pause before picking up the next task
    Write-Host ("  Pausing {0}s before next task... (Ctrl+C to stop)" -f $IntervalSeconds) -ForegroundColor Gray
    Start-Sleep -Seconds $IntervalSeconds
    Write-Host ""
}
