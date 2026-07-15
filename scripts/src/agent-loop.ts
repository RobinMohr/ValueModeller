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
import { execFileSync } from "node:child_process";
import { KiroRunner } from "./kiro-runner.js";
import { logAgentError } from "./error-logger.js";

// ---------------------------------------------------------------------------
// Task API Client
// ---------------------------------------------------------------------------

const TASK_API_BASE_URL = process.env.TASK_API_URL || "http://localhost:7071/api";
const TASK_API_KEY = process.env.TASK_API_KEY || "";

interface TaskApiResponse {
  id: string;
  title: string;
  priority: number;
  type: string;
  state: string;
  description: string;
  files: string[];
  origin: string;
}

/** Make an authenticated request to the Task API. */
async function taskApiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${TASK_API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(TASK_API_KEY ? { "x-api-key": TASK_API_KEY } : {}),
    ...(options.headers as Record<string, string> || {}),
  };
  return fetch(url, { ...options, headers });
}

/**
 * Fetch the next available todo task from the Task API.
 * Uses GET /api/tasks/next which returns the highest-priority todo task.
 * Returns null if no task available (204) or on error.
 */
async function fetchNextTask(): Promise<TaskApiResponse | null> {
  try {
    const response = await taskApiFetch("/tasks/next");
    if (response.status === 204) return null;
    if (!response.ok) {
      log(`  Task API error (GET /tasks/next): ${response.status} ${response.statusText}`, "red");
      return null;
    }
    return await response.json() as TaskApiResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Task API connection failed: ${msg}`, "red");
    return null;
  }
}

/**
 * Update a task's state via the Task API.
 * Uses PUT /api/tasks/:id with the new state.
 */
async function updateTaskState(taskId: string, state: string): Promise<boolean> {
  try {
    const response = await taskApiFetch(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ state }),
    });
    if (!response.ok) {
      log(`  Task API error (PUT /tasks/${taskId}): ${response.status} ${response.statusText}`, "red");
      return false;
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Task API update failed: ${msg}`, "red");
    return false;
  }
}

/**
 * Create a new task via the Task API.
 * Uses POST /api/tasks.
 */
async function createTaskViaApi(task: {
  title: string;
  priority: number;
  type: string;
  description: string;
  files?: string[];
  origin: string;
}): Promise<TaskApiResponse | null> {
  try {
    const response = await taskApiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({ ...task, state: "todo" }),
    });
    if (!response.ok) {
      log(`  Task API error (POST /tasks): ${response.status} ${response.statusText}`, "red");
      return null;
    }
    return await response.json() as TaskApiResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  Task API create failed: ${msg}`, "red");
    return null;
  }
}

/**
 * Check if there are any todo tasks via the Task API.
 * Uses GET /api/tasks/next — 200 means work is available, 204 means none.
 */
async function hasWorkViaApi(): Promise<boolean> {
  try {
    const response = await taskApiFetch("/tasks/next");
    return response.status === 200;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentType = "dev" | "qa" | "task-order" | "custom" | "information-collector";

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
The agent loop uses the Task API (GET /api/tasks/next, PUT /api/tasks/:id) to claim and update tasks.
If no task is assigned in the prompt, the loop will claim one automatically.
1) Implement the assigned task.
2) Run 'npm run build' to verify.
3) Set the task's state to 'developed' in the local file.
4) Append a timestamped entry to release_notes.md.
5) STOP. Do not pick another task. Exit immediately after completing one item.`,

  qa: `Run the QA and Improvement Research Agent. Follow all steps in your agent instructions:
1. Read project files for context (speciifcations.md, source files, IMPROVEMENTS.md)
2. Check existing tasks via the Task API: curl GET ${TASK_API_BASE_URL}/tasks with header x-api-key to avoid duplicates
3. Test the app with Puppeteer at http://localhost:5173 (use headless mode)
4. Research improvements via web search
5. Create NEW tasks via the Task API: POST ${TASK_API_BASE_URL}/tasks with header x-api-key and JSON body { title, priority, type, state: "todo", description, files, origin: "ai" }
6. Update IMPROVEMENTS.md with research insights

CRITICAL: When calling puppeteer_navigate for the FIRST time, you MUST pass launchOptions: { "headless": true, "args": ["--no-sandbox", "--disable-gpu"] }.
Check existing tasks via API first to avoid duplicates.

Task API environment:
- Base URL: ${TASK_API_BASE_URL}
- API Key header: x-api-key (value from TASK_API_KEY env var)`,

  "task-order": `You are the task prioritization agent. Your ONLY job is to read all tasks, evaluate their priority, re-order them, and exit.

Fetch all tasks from the Task API: GET ${TASK_API_BASE_URL}/tasks (with x-api-key header).
Read release_notes.md to understand what has already been done. Read speciifcations.md for project context.

To update a task's priority, use: PUT ${TASK_API_BASE_URL}/tasks/:id with JSON body { "priority": <new_number> } and x-api-key header.

Rules:
1. Problems (bugs) that break core functionality → priority 1
2. Items that block the demo → priority 1
3. Quick wins (under 1 hour, high impact) → priority 2
4. Features that enhance demo impression → priority 2-3
5. Nice-to-have ideas → priority 4
6. Tasks with state 'developed' or 'in-progress' should NOT be re-prioritized.

Output a brief summary of changes made (or 'No changes needed').
Do NOT create new tasks. Do NOT implement anything. Only re-prioritize existing todo tasks.

Task API environment:
- Base URL: ${TASK_API_BASE_URL}
- API Key header: x-api-key (value from TASK_API_KEY env var)`,

  custom: "", // Will use customPrompt from config

  "information-collector": "", // Will use dynamic prompt built from searchPrompt + outputFile passed via --prompt
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

/** Check if there are actionable tasks for the dev agent (uses Task API). */
async function hasWork(_cwd: string): Promise<boolean> {
  return hasWorkViaApi();
}

// ---------------------------------------------------------------------------
// Task claiming — atomic lock-based task assignment
// ---------------------------------------------------------------------------

interface TaskFile {
  filename: string;
  id: string;
  title: string;
  priority: number;
  type: string;
  state: string;
  description: string;
  files?: string[];
  origin: string;
}

// Origin priority is now handled server-side by the Task API's GET /tasks/next endpoint.

/**
 * Claim the highest-priority todo task via the Task API.
 *
 * Strategy:
 * 1. Call GET /api/tasks/next to get the top-priority todo task.
 * 2. Call PUT /api/tasks/:id to set state to "in-progress" (atomic claim).
 * 3. Return the task if successfully claimed, null otherwise.
 *
 * Returns null if no claimable task exists.
 */
async function claimTask(_cwd: string): Promise<TaskFile | null> {
  const apiTask = await fetchNextTask();
  if (!apiTask) return null;

  // Set state to in-progress via API (acts as our claim mechanism)
  const claimed = await updateTaskState(apiTask.id, "in-progress");
  if (!claimed) {
    log(`  Failed to claim task "${apiTask.title}" via API.`, "red");
    return null;
  }

  // Build a TaskFile-compatible filename for backward compatibility with commit messages etc.
  const kebabTitle = apiTask.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const filename = `${apiTask.priority}_${apiTask.id}_${kebabTitle}.json`;

  log(`  Claimed task: [P${apiTask.priority}] "${apiTask.title}" (${apiTask.id})`, "green");

  return {
    filename,
    id: apiTask.id,
    title: apiTask.title,
    priority: apiTask.priority,
    type: apiTask.type,
    state: "in-progress",
    description: apiTask.description,
    files: apiTask.files,
    origin: apiTask.origin,
  };
}

/**
 * Release the lock for a completed/failed task.
 * With Task API, state transitions are atomic — no lock files needed.
 * This is a no-op kept for interface compatibility.
 */
function releaseTaskLock(_cwd: string, _taskFilename: string): void {
  // No-op: Task API handles state atomically, no lock files used.
}

/**
 * Reset a task's state back to "todo" after a failed agent run via Task API.
 * This ensures the task goes back into the pool for the next iteration.
 */
async function resetTaskToTodo(_cwd: string, task: TaskFile): Promise<void> {
  if (!task.id) {
    log(`  Cannot reset task — no ID available.`, "red");
    return;
  }
  const success = await updateTaskState(task.id, "todo");
  if (success) {
    log(`  Task reset to "todo" via API: ${task.title}`, "yellow");
  } else {
    log(`  Failed to reset task state via API: ${task.title}`, "red");
  }
}

/**
 * Verify (and enforce) that a task's state is "developed" after a successful run.
 * Uses the Task API to set the state.
 */
async function ensureTaskDeveloped(_cwd: string, task: TaskFile): Promise<void> {
  if (!task.id) {
    log(`  Cannot verify task state — no ID available.`, "red");
    return;
  }
  const success = await updateTaskState(task.id, "developed");
  if (success) {
    log(`  Task state set to "developed" via API ✓`, "green");
  } else {
    log(`  Failed to set task state to "developed" via API.`, "red");
  }
}

/**
 * Clean up stale state — no longer needed with Task API.
 * The API handles atomic state transitions; no local lock files exist.
 */
function cleanupStaleLocks(_cwd: string): void {
  // No-op: Task API handles state atomically, no local lock files to clean up.
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
 * Build a meaningful commit message from the claimed task title.
 * Uses the title of the task that was claimed for THIS iteration,
 * avoiding false matches from previously-developed tasks that got
 * re-staged due to line-ending changes (CRLF warnings).
 */
function getCommitMessage(taskTitle: string): string {
  if (taskTitle) {
    return `feat: ${taskTitle}`;
  }
  return `chore: dev agent changes (${new Date().toISOString().slice(0, 16)})`;
}

/**
 * Stage all changes, commit with a meaningful message, and push to remote.
 * Returns true if successful, false otherwise.
 */
function commitAndPush(cwd: string, taskTitle: string): boolean {
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
    execFileSync("git", ["-c", "core.autocrlf=false", "-c", "core.safecrlf=false", "add", "."], {
      cwd,
      timeout: 30_000,
      stdio: "pipe",
    });

    // Build commit message from completed task
    const commitMessage = getCommitMessage(taskTitle);
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
 * The loop will also handle setting state to "developed" after success — the agent
 * should still update the local task file for backward compatibility.
 */
function buildDevPromptForTask(task: TaskFile): string {
  const files = task.files ?? [];
  const filesList = files.length > 0
    ? files.map((f) => `  - ${f}`).join("\n")
    : "  (no specific files listed — investigate based on description)";

  return `You are the Developer Implementation Agent. You have been ASSIGNED a specific task. Do NOT pick a task yourself — this task has already been selected and claimed for you.

## YOUR ASSIGNED TASK

**Task ID:** ${task.id}
**File:** tasks/${task.filename}
**Title:** ${task.title}
**Priority:** ${task.priority}
**Type:** ${task.type}
**Description:** ${task.description}

**Relevant files:**
${filesList}

## INSTRUCTIONS

The task state is already set to "in-progress" via the Task API. Do the following:

1. Read the relevant source files to understand the current state.
2. Implement the change described above. Follow coding standards (TypeScript strict, functional components, named exports, Tailwind CSS, Zustand).
3. Run \`npm run build\` to verify no TypeScript or build errors.
4. Set the task state to "developed" in the local task file tasks/${task.filename} (for backward compatibility).
5. Append a timestamped entry to release_notes.md describing what you did. IMPORTANT: Insert the new entry AFTER the \`# Release Notes\` header line (line 1), not before it. The header must always remain the first line of the file.
6. STOP. Do not pick another task. Exit immediately.

## CRITICAL RULES

- Do NOT read all tasks looking for work. Your task is assigned above.
- Do NOT change the task's state to anything other than "developed" when done.
- Do NOT skip this task and pick a different one.
- If the work described in the task is ALREADY implemented in the codebase (e.g., a prior iteration fixed it), still set state to "developed", add a brief note to release_notes.md that the fix was already present, and exit. Do not waste time re-verifying every detail.
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
  } else if ((config.type === "custom" || config.type === "information-collector") && config.customPrompt) {
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
    "information-collector": "cyan",
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
        await ensureTaskDeveloped(cwd, claimedTask);
        commitAndPush(cwd, claimedTask.title);
      }
    } else {
      log(
        `[${timestamp()}] Iteration ${iteration} ended with issues. (Duration: ${duration}s)`,
        "red"
      );

      // For dev agents: reset task back to "todo" so it can be retried
      if (config.type === "dev" && claimedTask) {
        await resetTaskToTodo(cwd, claimedTask);
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
