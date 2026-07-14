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

$prompt = "Run the QA and Improvement Research Agent. Follow all steps in your agent instructions: read project files, test the app with Puppeteer at http://localhost:5173, research improvements via web search, and update IMPROVEMENTS.md. IMPORTANT: 1) After you are done with Puppeteer testing, close the browser by running puppeteer_evaluate with script 'window.close()' or navigate to about:blank so the browser window does not stay open. 2) Do NOT add duplicate ideas to IMPROVEMENTS.md. Read the existing file first, and if an idea already exists, either skip it or extend/refine the existing entry in place. Only add genuinely new findings."

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

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "kiro-cli"
    $psi.Arguments = ('chat --no-interactive -a --agent qa-improvement-agent "{0}"' -f $prompt)
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
            Write-Host "  TIMEOUT: kiro-cli exceeded timeout, killing process." -ForegroundColor Red
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
