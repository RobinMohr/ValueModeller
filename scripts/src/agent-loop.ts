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
import { resolve, join } from "node:path";
import { readFile, readdir, writeFile, unlink, open } from "node:fs/promises";
import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
    const tasksDir = join(cwd, "tasks");
    const files = readdirSync(tasksDir).filter((f) => f.endsWith(".json") && !f.startsWith("0_"));
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
// Task claiming — atomic lock-based task assignment
// ---------------------------------------------------------------------------

interface TaskFile {
  filename: string;
  title: string;
  priority: number;
  type: string;
  state: string;
  description: string;
  files?: string[];
  origin: string;
}

/** Origin priority: user > user-assisted > ai. Lower = higher priority. */
const ORIGIN_RANK: Record<string, number> = {
  user: 0,
  "user-assisted": 1,
  ai: 2,
};

function getOriginRank(origin: string): number {
  return ORIGIN_RANK[origin] ?? 99;
}

/**
 * Atomically claim the highest-priority todo task.
 *
 * Strategy:
 * 1. Read all task files, filter to state=todo, sort by priority then origin
 * 2. For the best candidate, attempt to create a <task>.lock file using
 *    exclusive mode (wx flag). This is atomic — if another process already
 *    created it, the open() call fails.
 * 3. If lock acquired, set the task state to "in-progress" and return it.
 * 4. If lock fails (another agent claimed it), try the next candidate.
 *
 * Returns null if no claimable task exists.
 */
async function claimTask(cwd: string): Promise<TaskFile | null> {
  const tasksDir = join(cwd, "tasks");

  let files: string[];
  try {
    files = readdirSync(tasksDir).filter(
      (f) => f.endsWith(".json") && !f.startsWith("0_")
    );
  } catch {
    return null;
  }

  // Parse all todo tasks
  const todoTasks: TaskFile[] = [];
  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(join(tasksDir, file), "utf-8"));
      if (content.state === "todo") {
        todoTasks.push({ filename: file, ...content });
      }
    } catch {
      /* skip unreadable files */
    }
  }

  if (todoTasks.length === 0) return null;

  // Sort: lowest priority number first, then origin rank (user > user-assisted > ai)
  todoTasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return getOriginRank(a.origin) - getOriginRank(b.origin);
  });

  // Try to claim tasks in priority order
  for (const task of todoTasks) {
    const lockPath = join(tasksDir, `${task.filename}.lock`);

    try {
      // Atomic exclusive create — fails if file already exists
      const handle = await open(lockPath, "wx");
      await handle.write(
        JSON.stringify({
          claimedAt: new Date().toISOString(),
          pid: process.pid,
        })
      );
      await handle.close();

      // Lock acquired! Now set state to in-progress
      const taskPath = join(tasksDir, task.filename);
      const taskContent = JSON.parse(readFileSync(taskPath, "utf-8"));
      taskContent.state = "in-progress";
      writeFileSync(taskPath, JSON.stringify(taskContent, null, 2) + "\n");

      log(`  Claimed task: [P${task.priority}] "${task.title}" (${task.filename})`, "green");
      return { ...task, state: "in-progress" };
    } catch (err: unknown) {
      // EEXIST means another process already has the lock — try next task
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        log(`  Task "${task.title}" already claimed (lock exists). Skipping.`, "gray");
        continue;
      }
      // Other error — skip this task
      log(`  Failed to claim "${task.title}": ${(err as Error).message}`, "red");
      continue;
    }
  }

  return null; // All todo tasks are already claimed by other agents
}

/**
 * Release the lock for a completed/failed task.
 * Call this after the agent finishes (success or failure).
 */
function releaseTaskLock(cwd: string, taskFilename: string): void {
  const lockPath = join(cwd, "tasks", `${taskFilename}.lock`);
  try {
    unlinkSync(lockPath);
    log(`  Released lock for: ${taskFilename}`, "gray");
  } catch {
    /* lock already gone — fine */
  }
}

/**
 * Reset a task's state back to "todo" after a failed agent run.
 * This ensures the task goes back into the pool for the next iteration.
 */
function resetTaskToTodo(cwd: string, taskFilename: string): void {
  const taskPath = join(cwd, "tasks", taskFilename);
  try {
    const content = JSON.parse(readFileSync(taskPath, "utf-8"));
    content.state = "todo";
    writeFileSync(taskPath, JSON.stringify(content, null, 2) + "\n");
    log(`  Task reset to "todo": ${taskFilename}`, "yellow");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Failed to reset task state: ${msg}`, "red");
  }
}

/**
 * Verify (and enforce) that a task's state is "developed" after a successful run.
 * If the agent didn't set it, we force it here as the loop's guarantee.
 */
function ensureTaskDeveloped(cwd: string, taskFilename: string): void {
  const taskPath = join(cwd, "tasks", taskFilename);
  try {
    const content = JSON.parse(readFileSync(taskPath, "utf-8"));
    if (content.state !== "developed") {
      log(`  Task state is "${content.state}" after success — forcing to "developed".`, "yellow");
      content.state = "developed";
      writeFileSync(taskPath, JSON.stringify(content, null, 2) + "\n");
    } else {
      log(`  Task state verified: "developed" ✓`, "green");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Failed to verify task state: ${msg}`, "red");
  }
}

/**
 * Clean up any stale lock files from crashed previous runs.
 * A lock is considered stale if the task state is not "in-progress"
 * (meaning the agent finished but the lock wasn't cleaned up).
 */
function cleanupStaleLocks(cwd: string): void {
  const tasksDir = join(cwd, "tasks");
  try {
    const files = readdirSync(tasksDir).filter((f) => f.endsWith(".lock"));
    for (const lockFile of files) {
      const taskFile = lockFile.replace(".lock", "");
      const taskPath = join(tasksDir, taskFile);

      try {
        const content = JSON.parse(readFileSync(taskPath, "utf-8"));
        // If the task isn't in-progress, the lock is stale
        if (content.state !== "in-progress") {
          unlinkSync(join(tasksDir, lockFile));
          log(`  Cleaned stale lock: ${lockFile}`, "yellow");
        } else {
          // Check if the lock is older than the timeout (e.g., 20 minutes)
          const lockContent = JSON.parse(
            readFileSync(join(tasksDir, lockFile), "utf-8")
          );
          const claimedAt = new Date(lockContent.claimedAt).getTime();
          const staleThresholdMs = 20 * 60 * 1000; // 20 minutes
          if (Date.now() - claimedAt > staleThresholdMs) {
            unlinkSync(join(tasksDir, lockFile));
            // Also reset the task back to todo since the agent likely crashed
            content.state = "todo";
            writeFileSync(taskPath, JSON.stringify(content, null, 2) + "\n");
            log(`  Cleaned expired lock (>20min): ${lockFile} — task reset to todo`, "yellow");
          }
        }
      } catch {
        // Task file doesn't exist or can't be read — remove orphaned lock
        try {
          unlinkSync(join(tasksDir, lockFile));
        } catch { /* best effort */ }
      }
    }
  } catch {
    /* tasks dir doesn't exist or can't be read */
  }
}

// ---------------------------------------------------------------------------
// Git helpers for dev agent (branch management, commit, push)
// ---------------------------------------------------------------------------

const TARGET_BRANCH = "develop";

/**
 * Ensure the working tree is on the `develop` branch.
 * If the branch doesn't exist locally, create it from the current HEAD.
 * If it exists but isn't checked out, switch to it.
 */
function ensureDevelopBranch(cwd: string): boolean {
  try {
    // Get current branch name
    const currentBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();

    if (currentBranch === TARGET_BRANCH) {
      log(`  Git: already on '${TARGET_BRANCH}' branch.`, "gray");
      return true;
    }

    log(`  Git: currently on '${currentBranch}', switching to '${TARGET_BRANCH}'...`, "yellow");

    // Check if develop branch exists locally
    try {
      execFileSync("git", ["rev-parse", "--verify", TARGET_BRANCH], {
        cwd,
        encoding: "utf-8",
        timeout: 10_000,
        stdio: "pipe",
      });
      // Branch exists, check it out
      execFileSync("git", ["checkout", TARGET_BRANCH], {
        cwd,
        encoding: "utf-8",
        timeout: 10_000,
      });
    } catch {
      // Branch doesn't exist, create it from current HEAD
      log(`  Git: '${TARGET_BRANCH}' branch doesn't exist. Creating it...`, "yellow");
      execFileSync("git", ["checkout", "-b", TARGET_BRANCH], {
        cwd,
        encoding: "utf-8",
        timeout: 10_000,
      });
    }

    log(`  Git: now on '${TARGET_BRANCH}' branch.`, "green");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Git: failed to switch to '${TARGET_BRANCH}': ${msg}`, "red");
    return false;
  }
}

/**
 * Build a meaningful commit message from the tasks that were completed.
 * Looks for tasks with state 'in-progress' or recently changed to 'developed'.
 */
function getCommitMessage(cwd: string): string {
  try {
    const tasksDir = join(cwd, "tasks");
    const files = readdirSync(tasksDir).filter((f) => f.endsWith(".json"));

    // Stage all first so we can check what's staged
    const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd,
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();

    // Find tasks that were developed in this iteration
    const developedTasks: string[] = [];
    for (const file of files) {
      try {
        const content = JSON.parse(readFileSync(join(tasksDir, file), "utf-8"));
        if (content.state === "developed" || content.state === "in-progress") {
          if (stagedFiles.includes(`tasks/${file}`)) {
            developedTasks.push(content.title || file.replace(".json", ""));
          }
        }
      } catch {
        /* skip unreadable task files */
      }
    }

    if (developedTasks.length > 0) {
      const taskTitles = developedTasks.join(", ");
      return `feat: ${taskTitles}`;
    }

    // Fallback: use a generic message with timestamp
    return `chore: dev agent changes (${new Date().toISOString().slice(0, 16)})`;
  } catch {
    return `chore: dev agent changes (${new Date().toISOString().slice(0, 16)})`;
  }
}

/**
 * Stage all changes, commit with a meaningful message, and push to remote.
 * Returns true if successful, false otherwise.
 */
function commitAndPush(cwd: string): boolean {
  try {
    // Check if there are any changes to commit
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();

    if (!status) {
      log(`  Git: no changes to commit.`, "gray");
      return true;
    }

    log(`  Git: staging all changes...`, "gray");
    execFileSync("git", ["add", "."], {
      cwd,
      timeout: 30_000,
    });

    // Build commit message from completed task
    const commitMessage = getCommitMessage(cwd);
    log(`  Git: committing: "${commitMessage}"`, "cyan");
    execFileSync("git", ["commit", "-m", commitMessage], {
      cwd,
      encoding: "utf-8",
      timeout: 30_000,
    });

    log(`  Git: pushing to remote...`, "cyan");
    execFileSync("git", ["push", "-u", "origin", TARGET_BRANCH], {
      cwd,
      encoding: "utf-8",
      timeout: 60_000,
    });

    log(`  Git: pushed successfully to origin/${TARGET_BRANCH}.`, "green");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Git: commit/push failed: ${msg}`, "red");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Task-specific prompt builder for dev agent
// ---------------------------------------------------------------------------

/**
 * Build a focused prompt that tells the dev agent exactly which task to implement.
 * The loop has already claimed the task and set its state to "in-progress".
 */
function buildDevPromptForTask(task: TaskFile): string {
  const files = task.files ?? [];
  const filesList = files.length > 0
    ? files.map((f) => `  - ${f}`).join("\n")
    : "  (no specific files listed — investigate based on description)";

  return `You are the Developer Implementation Agent. You have been ASSIGNED a specific task. Do NOT pick a task yourself — this task has already been selected and claimed for you.

## YOUR ASSIGNED TASK

**File:** tasks/${task.filename}
**Title:** ${task.title}
**Priority:** ${task.priority}
**Type:** ${task.type}
**Description:** ${task.description}

**Relevant files:**
${filesList}

## INSTRUCTIONS

The task state is already set to "in-progress". Do the following:

1. Read the relevant source files to understand the current state.
2. Implement the change described above. Follow coding standards (TypeScript strict, functional components, named exports, Tailwind CSS, Zustand).
3. Run \`npm run build\` to verify no TypeScript or build errors.
4. Set the task state to "developed" in tasks/${task.filename}.
5. Append a timestamped entry to release_notes.md describing what you did.
6. STOP. Do not pick another task. Exit immediately.

## CRITICAL RULES

- Do NOT read all tasks looking for work. Your task is assigned above.
- Do NOT change the task's state to anything other than "developed" when done.
- Do NOT skip this task and pick a different one.
- If the task cannot be completed (e.g., missing dependencies, unclear requirements), set state to "todo" (to unclaim it) and explain why in release_notes.md.
- Keep changes minimal and focused on THIS task only.`;
}

// ---------------------------------------------------------------------------
// Run a single iteration
// ---------------------------------------------------------------------------

async function runIteration(
  cwd: string,
  config: AgentLoopConfig,
  iteration: number,
  claimedTask?: TaskFile | null
): Promise<boolean> {
  let runner: KiroRunner | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const outputLines: string[] = [];

  // For dev agents with a claimed task, build a task-specific prompt
  let prompt: string;
  if (config.type === "dev" && claimedTask) {
    prompt = buildDevPromptForTask(claimedTask);
  } else if (config.type === "custom" && config.customPrompt) {
    prompt = config.customPrompt;
  } else {
    prompt = PROMPTS[config.type];
  }

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
    // For dev agents, claim a task atomically before spawning the agent
    let claimedTask: TaskFile | null = null;
    if (config.type === "dev") {
      // Clean up any stale locks from crashed previous runs
      cleanupStaleLocks(cwd);

      claimedTask = await claimTask(cwd);
      if (!claimedTask) {
        log(
          `[${timestamp()}] No claimable tasks in tasks/. Waiting 60s...`,
          "yellow"
        );
        await sleep(60_000);
        if (stopping) break;
        continue;
      }
    }

    // For dev agents, ensure we're on the develop branch before starting work
    if (config.type === "dev") {
      if (!ensureDevelopBranch(cwd)) {
        log(`[${timestamp()}] Cannot switch to '${TARGET_BRANCH}' branch. Waiting 30s...`, "red");
        // Release the lock since we can't proceed
        if (claimedTask) releaseTaskLock(cwd, claimedTask.filename);
        await sleep(30_000);
        if (stopping) break;
        continue;
      }
    }

    iteration++;
    const startTime = Date.now();
    log(`[${timestamp()}] === Iteration ${iteration} ===`, "yellow");

    const success = await runIteration(cwd, config, iteration, claimedTask);

    const duration = Math.round((Date.now() - startTime) / 1000);
    if (success) {
      log(
        `[${timestamp()}] Iteration ${iteration} done. (Duration: ${duration}s)`,
        "green"
      );

      // For dev agents: verify task is "developed", then commit and push
      if (config.type === "dev" && claimedTask) {
        ensureTaskDeveloped(cwd, claimedTask.filename);
        commitAndPush(cwd);
      }
    } else {
      log(
        `[${timestamp()}] Iteration ${iteration} ended with issues. (Duration: ${duration}s)`,
        "red"
      );

      // For dev agents: reset task back to "todo" so it can be retried
      if (config.type === "dev" && claimedTask) {
        resetTaskToTodo(cwd, claimedTask.filename);
      }
    }

    // Release the task lock after the iteration completes (success or failure)
    if (config.type === "dev" && claimedTask) {
      releaseTaskLock(cwd, claimedTask.filename);
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
