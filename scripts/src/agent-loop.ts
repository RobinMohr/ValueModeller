/**
 * Unified Agent Loop
 *
 * Runs ANY Kiro agent via ACP protocol in a configurable loop.
 * Supports all agent types (dev, qa, task-order, custom) with per-agent
 * configuration for interval, timeout, and max iterations.
 *
 * Usage:
 *   node dist/agent-loop.js --agent developer-agent --type dev
 *   node dist/agent-loop.js --agent qa-improvement-agent --type qa --interval 30 --timeout 600
 *   node dist/agent-loop.js --agent task-order-agent --type task-order --max-iterations 1
 *   node dist/agent-loop.js --agent my-custom-agent --type custom --prompt "Do something"
 */
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { KiroRunner } from "./kiro-runner.js";
import { logAgentError } from "./error-logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentType = "dev" | "qa" | "task-order" | "custom";

export interface AgentLoopConfig {
  agent: string;
  type: AgentType;
  intervalSeconds: number;
  timeoutSeconds: number;
  maxIterations: number;
  customPrompt?: string;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): AgentLoopConfig {
  const args = process.argv.slice(2);
  const config: AgentLoopConfig = {
    agent: "developer-agent",
    type: "dev",
    intervalSeconds: 0,
    timeoutSeconds: 900,
    maxIterations: 0, // 0 = infinite
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--agent":
        config.agent = args[++i];
        break;
      case "--type":
        config.type = args[++i] as AgentType;
        break;
      case "--interval":
        config.intervalSeconds = parseInt(args[++i], 10);
        break;
      case "--timeout":
        config.timeoutSeconds = parseInt(args[++i], 10);
        break;
      case "--max-iterations":
        config.maxIterations = parseInt(args[++i], 10);
        break;
      case "--prompt":
        config.customPrompt = args[++i];
        break;
    }
  }
  return config;
}

// ---------------------------------------------------------------------------
// Built-in prompts per agent type
// ---------------------------------------------------------------------------

const PROMPTS: Record<AgentType, string> = {
  dev: `You are the Developer Implementation Agent. Do exactly ONE task and then stop.
1) Read all task JSON files in tasks/. If no tasks have state 'todo', say 'No actionable tasks' and exit.
2) Pick the SINGLE highest-priority task (lowest priority number) with state 'todo'.
3) Set its state to 'in-progress' immediately.
4) Read relevant source files, implement the change.
5) Run 'npm run build' to verify.
6) Set the task's state to 'developed'.
7) Append a timestamped entry to release_notes.md.
8) STOP. Do not pick another task. Exit immediately after completing one item.`,

  qa: `Run the QA and Improvement Research Agent. Follow all steps in your agent instructions:
1. Read project files for context (speciifcations.md, tasks/, source files, IMPROVEMENTS.md)
2. Test the app with Puppeteer at http://localhost:5173 (use headless mode)
3. Research improvements via web search
4. Create NEW task JSON files in tasks/ for findings (no duplicates)
5. Update IMPROVEMENTS.md with research insights

CRITICAL: When calling puppeteer_navigate for the FIRST time, you MUST pass launchOptions: { "headless": true, "args": ["--no-sandbox", "--disable-gpu"] }.
Read existing tasks first to avoid duplicates.`,

  "task-order": `You are the task prioritization agent. Your ONLY job is to read all tasks in tasks/, evaluate their priority, re-order them, and exit.

Read ALL JSON files in tasks/. Read release_notes.md to understand what has already been done. Read speciifcations.md for project context.

Rules:
1. Problems (bugs) that break core functionality → priority 1
2. Items that block the demo → priority 1
3. Quick wins (under 1 hour, high impact) → priority 2
4. Features that enhance demo impression → priority 2-3
5. Nice-to-have ideas → priority 4
6. Tasks with state 'developed' or 'in-progress' should NOT be re-prioritized.
7. If a task file's priority number doesn't match its filename prefix, RENAME the file.

Output a brief summary of changes made (or 'No changes needed').
Do NOT create new tasks. Do NOT implement anything. Only re-prioritize existing todo tasks.`,

  custom: "", // Will use customPrompt from config
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(msg: string, color?: "cyan" | "yellow" | "green" | "red" | "gray"): void {
  const colors: Record<string, string> = {
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    gray: "\x1b[90m",
  };
  const reset = "\x1b[0m";
  const prefix = color ? colors[color] : "";
  const suffix = color ? reset : "";
  console.log(`${prefix}${msg}${suffix}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip ANSI escape codes and emoji from text for clean terminal output. */
function stripAnsiAndEmoji(text: string): string {
  const noAnsi = text.replace(/\x1b\[[0-9;]*m/g, "");
  const noEmoji = noAnsi.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    ""
  );
  return noEmoji;
}

/**
 * Kill any orphaned kiro-cli.exe processes left over from a previous crashed
 * or improperly-terminated run. On Windows, KiroRunner.close() uses taskkill,
 * but if a prior run was killed abruptly (e.g. Ctrl+C, crash) the subprocess
 * can be left running, holding stdio pipes/session state that cause new
 * spawns to fail. Call this once at startup as a safety net.
 */
async function cleanupOrphanedProcesses(): Promise<void> {
  if (process.platform !== "win32") return;
  try {
    const { execFileSync } = await import("node:child_process");
    // Only target kiro-cli.exe processes running the "acp" subcommand,
    // to avoid killing an unrelated interactive kiro-cli session the user
    // might have open elsewhere.
    //
    // NOTE: use execFileSync (no shell) instead of execSync here. execSync
    // routes the command through cmd.exe, and cmd's quote-toggling parser
    // strips the inner double quotes around "Name='kiro-cli.exe'" before
    // PowerShell ever sees them, producing an invalid WQL filter and a
    // "CimException: Invalid query" error. execFileSync passes the command
    // string as a single argument directly to powershell.exe, bypassing
    // cmd's re-quoting entirely.
    const psCommand =
      "Get-CimInstance Win32_Process -Filter \"Name='kiro-cli.exe'\" " +
      "| Where-Object { $_.CommandLine -match 'acp' } " +
      "| Select-Object -ExpandProperty ProcessId";
    const output = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", psCommand],
      { encoding: "utf-8", timeout: 10_000 }
    ).trim();
    const pids = output
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s));
    if (pids.length === 0) return;
    log(
      `  Cleaning up ${pids.length} orphaned kiro-cli process(es) from a previous run...`,
      "yellow"
    );
    for (const pid of pids) {
      try {
        execFileSync("taskkill", ["/PID", pid, "/T", "/F"], {
          timeout: 5_000,
          stdio: "ignore",
        });
      } catch {
        /* already gone, or couldn't be killed — best effort */
      }
    }
  } catch {
    /* best effort; do not block startup on cleanup failure */
  }
}

/** Check if there are actionable tasks for the dev agent. */
async function hasWork(cwd: string): Promise<boolean> {
  try {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const tasksDir = join(cwd, "tasks");
    const files = readdirSync(tasksDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const content = JSON.parse(readFileSync(join(tasksDir, file), "utf-8"));
      if (content.state === "todo") return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Run a single iteration
// ---------------------------------------------------------------------------

async function runIteration(
  cwd: string,
  config: AgentLoopConfig,
  iteration: number
): Promise<boolean> {
  let runner: KiroRunner | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const outputLines: string[] = [];

  const prompt =
    config.type === "custom" && config.customPrompt
      ? config.customPrompt
      : PROMPTS[config.type];

  if (!prompt) {
    log(`  ERROR: No prompt defined for type '${config.type}'. Use --prompt for custom agents.`, "red");
    logAgentError(cwd, {
      agentName: config.agent,
      agentType: config.type,
      error: `No prompt defined for type '${config.type}'. Use --prompt for custom agents.`,
      iteration,
      config: {
        intervalSeconds: config.intervalSeconds,
        timeoutSeconds: config.timeoutSeconds,
        maxIterations: config.maxIterations,
      },
      cwd,
      notes: "The agent type has no built-in prompt and no --prompt flag was provided.",
    });
    return false;
  }

  try {
    log(`  Starting kiro-cli acp --agent ${config.agent}...`, "gray");

    runner = await KiroRunner.create({
      agent: config.agent,
      cwd,
    });

    log(`  ACP session established (PID: ${runner.pid})`, "gray");

    // Set up timeout
    let timedOut = false;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        log(`  TIMEOUT: exceeded ${config.timeoutSeconds}s`, "red");
        resolve();
      }, config.timeoutSeconds * 1000);
    });

    // Run the prompt with streaming output
    const promptLoop = async () => {
      for await (const update of runner!.prompt(prompt)) {
        if (timedOut) break;

        if ("sessionUpdate" in update) {
          switch (update.sessionUpdate) {
            case "agent_message_chunk":
              if (
                "content" in update &&
                update.content &&
                typeof (update.content as { text?: string }).text === "string"
              ) {
                const text = stripAnsiAndEmoji((update.content as { text: string }).text);
                process.stdout.write(text);
                // Capture output lines for error reporting
                const lines = text.split("\n").filter((l) => l.trim());
                outputLines.push(...lines);
              }
              break;
            case "tool_call":
              if ("title" in update) {
                const status = "status" in update ? update.status : "";
                const toolLine = `[Tool] ${(update as { title: string }).title} (${status})`;
                log(`\n  ${toolLine}`, "gray");
                outputLines.push(toolLine);
              }
              break;
            case "tool_call_update":
              if ("status" in update && update.status === "completed") {
                log(`\n  Tool completed.`, "green");
              }
              break;
          }
        }
      }
    };

    // Race: prompt completion vs timeout
    await Promise.race([promptLoop(), timeoutPromise]);

    if (timeoutHandle) clearTimeout(timeoutHandle);

    // Log timeout as an error
    if (timedOut) {
      logAgentError(cwd, {
        agentName: config.agent,
        agentType: config.type,
        error: `Agent exceeded timeout of ${config.timeoutSeconds} seconds`,
        iteration,
        isTimeout: true,
        config: {
          intervalSeconds: config.intervalSeconds,
          timeoutSeconds: config.timeoutSeconds,
          maxIterations: config.maxIterations,
        },
        lastOutput: outputLines,
        prompt,
        cwd,
        notes: "The agent did not complete within the configured timeout. Consider increasing --timeout or breaking the task into smaller pieces.",
      });
    }

    return !timedOut;
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    log(`  ERROR: ${errorObj.message}`, "red");

    // Log the breaking error to errors/ folder
    logAgentError(cwd, {
      agentName: config.agent,
      agentType: config.type,
      error: errorObj,
      iteration,
      config: {
        intervalSeconds: config.intervalSeconds,
        timeoutSeconds: config.timeoutSeconds,
        maxIterations: config.maxIterations,
      },
      lastOutput: outputLines,
      prompt,
      cwd,
    });

    return false;
  } finally {
    if (runner) {
      try {
        await runner.close();
      } catch {
        /* best effort */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = parseArgs();
  const cwd = resolve(import.meta.dirname, "../..");

  await cleanupOrphanedProcesses();

  const typeColors: Record<AgentType, "green" | "cyan" | "yellow" | "gray"> = {
    dev: "green",
    qa: "cyan",
    "task-order": "yellow",
    custom: "gray",
  };
  const color = typeColors[config.type] || "cyan";

  log("============================================================", color);
  log(` TecFactory — Agent Loop [${config.type.toUpperCase()}]`, color);
  log(` Agent: ${config.agent}`, color);
  log(
    ` Interval: ${config.intervalSeconds}s | Timeout: ${config.timeoutSeconds}s | Max: ${config.maxIterations || "infinite"}`,
    color
  );
  log(" Press Ctrl+C to stop", color);
  log("============================================================", color);
  log("");

  let iteration = 0;

  // Handle graceful shutdown
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(1);
    stopping = true;
    log("\n  Received SIGINT, finishing current iteration...", "yellow");
  });

  while (!stopping) {
    // For dev agents, pre-check if there's work available
    if (config.type === "dev") {
      if (!(await hasWork(cwd))) {
        log(
          `[${timestamp()}] No actionable tasks in tasks/. Waiting 60s...`,
          "yellow"
        );
        await sleep(60_000);
        if (stopping) break;
        continue;
      }
    }

    iteration++;
    const startTime = Date.now();
    log(`[${timestamp()}] === Iteration ${iteration} ===`, "yellow");

    const success = await runIteration(cwd, config, iteration);

    const duration = Math.round((Date.now() - startTime) / 1000);
    if (success) {
      log(
        `[${timestamp()}] Iteration ${iteration} done. (Duration: ${duration}s)`,
        "green"
      );
    } else {
      log(
        `[${timestamp()}] Iteration ${iteration} ended with issues. (Duration: ${duration}s)`,
        "red"
      );
    }

    // Check max iterations
    if (config.maxIterations > 0 && iteration >= config.maxIterations) {
      log(`\n  Max iterations (${config.maxIterations}) reached. Stopping.`, "cyan");
      break;
    }

    if (stopping) break;

    // Wait between iterations
    if (config.intervalSeconds > 0) {
      log(
        `  Next iteration in ${config.intervalSeconds}s... (Ctrl+C to stop)`,
        "gray"
      );
      await sleep(config.intervalSeconds * 1000);
    }
    log("");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  // Log fatal startup errors to errors/ folder
  const cwd = resolve(import.meta.dirname, "../..");
  logAgentError(cwd, {
    agentName: "unknown",
    agentType: "unknown",
    error: err instanceof Error ? err : new Error(String(err)),
    notes: "Fatal error during agent loop startup. The loop could not initialize.",
    cwd,
  });
  process.exit(1);
});
