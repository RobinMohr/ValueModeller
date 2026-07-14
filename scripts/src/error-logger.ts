/**
 * Error Logger
 *
 * Writes agent errors to the `errors/` folder as timestamped markdown files.
 * Each file contains all necessary information to reproduce the error:
 * - Agent name and type
 * - Timestamp
 * - Error message and stack trace
 * - Agent configuration (timeout, interval, etc.)
 * - Last output from the agent (if available)
 * - Iteration number
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorContext {
  /** Agent identifier (e.g., "developer-agent") */
  agentName: string;
  /** Agent type (dev, qa, task-order, custom) */
  agentType: string;
  /** The error that occurred */
  error: Error | string;
  /** Iteration number when the error occurred */
  iteration?: number;
  /** Whether the error was a timeout */
  isTimeout?: boolean;
  /** Agent configuration values */
  config?: {
    intervalSeconds?: number;
    timeoutSeconds?: number;
    maxIterations?: number;
    customPrompt?: string;
  };
  /** Last N lines of agent output before the error */
  lastOutput?: string[];
  /** The prompt that was sent to the agent */
  prompt?: string;
  /** Working directory */
  cwd?: string;
  /** Additional context or notes */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ERRORS_DIR_NAME = "errors";

function getErrorsDir(projectRoot: string): string {
  return resolve(projectRoot, ERRORS_DIR_NAME);
}

function ensureErrorsDir(projectRoot: string): string {
  const dir = getErrorsDir(projectRoot);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function generateFilename(agentType: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const slug = agentType.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  return `${timestamp}_${slug}.md`;
}

function formatError(error: Error | string): { message: string; stack: string } {
  if (typeof error === "string") {
    return { message: error, stack: "No stack trace available" };
  }
  return {
    message: error.message || "Unknown error",
    stack: error.stack || "No stack trace available",
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Log an agent error to the errors/ folder as a markdown file.
 *
 * @param projectRoot - Path to the project root (where errors/ will be created)
 * @param context - Error context with all reproduction information
 * @returns The path to the created error file, or null if logging failed
 */
export function logAgentError(projectRoot: string, context: ErrorContext): string | null {
  try {
    const errorsDir = ensureErrorsDir(projectRoot);
    const filename = generateFilename(context.agentType);
    const filepath = join(errorsDir, filename);

    const { message, stack } = formatError(context.error);
    const now = new Date().toISOString();

    const sections: string[] = [];

    // Header
    sections.push(`# Agent Error Report`);
    sections.push("");
    sections.push(`**Timestamp:** ${now}`);
    sections.push(`**Agent:** ${context.agentName}`);
    sections.push(`**Type:** ${context.agentType}`);
    if (context.iteration !== undefined) {
      sections.push(`**Iteration:** ${context.iteration}`);
    }
    if (context.isTimeout) {
      sections.push(`**Error Type:** TIMEOUT`);
    }
    sections.push("");

    // Error details
    sections.push("## Error");
    sections.push("");
    sections.push("```");
    sections.push(message);
    sections.push("```");
    sections.push("");

    // Stack trace
    if (stack !== "No stack trace available") {
      sections.push("## Stack Trace");
      sections.push("");
      sections.push("```");
      sections.push(stack);
      sections.push("```");
      sections.push("");
    }

    // Configuration
    if (context.config) {
      sections.push("## Agent Configuration");
      sections.push("");
      sections.push("| Parameter | Value |");
      sections.push("|-----------|-------|");
      if (context.config.timeoutSeconds !== undefined) {
        sections.push(`| Timeout | ${context.config.timeoutSeconds}s |`);
      }
      if (context.config.intervalSeconds !== undefined) {
        sections.push(`| Interval | ${context.config.intervalSeconds}s |`);
      }
      if (context.config.maxIterations !== undefined) {
        sections.push(`| Max Iterations | ${context.config.maxIterations} |`);
      }
      sections.push("");
    }

    // Working directory
    if (context.cwd) {
      sections.push("## Working Directory");
      sections.push("");
      sections.push("```");
      sections.push(context.cwd);
      sections.push("```");
      sections.push("");
    }

    // Prompt (truncated to avoid huge files)
    if (context.prompt) {
      const truncatedPrompt =
        context.prompt.length > 2000
          ? context.prompt.slice(0, 2000) + "\n... (truncated)"
          : context.prompt;
      sections.push("## Prompt Sent");
      sections.push("");
      sections.push("```");
      sections.push(truncatedPrompt);
      sections.push("```");
      sections.push("");
    }

    // Last output
    if (context.lastOutput && context.lastOutput.length > 0) {
      sections.push("## Last Agent Output (before error)");
      sections.push("");
      sections.push("```");
      // Keep last 50 lines max
      const lines = context.lastOutput.slice(-50);
      sections.push(lines.join("\n"));
      sections.push("```");
      sections.push("");
    }

    // Additional notes
    if (context.notes) {
      sections.push("## Notes");
      sections.push("");
      sections.push(context.notes);
      sections.push("");
    }

    // Reproduction steps
    sections.push("## How to Reproduce");
    sections.push("");
    sections.push("1. Navigate to the project root:");
    sections.push(`   \`\`\`bash`);
    sections.push(`   cd "${context.cwd || projectRoot}"`);
    sections.push(`   \`\`\``);
    sections.push(
      `2. Run the agent loop with the same configuration:`
    );
    sections.push(`   \`\`\`bash`);
    const reproCmd = buildReproCommand(context);
    sections.push(`   ${reproCmd}`);
    sections.push(`   \`\`\``);
    sections.push(
      `3. Observe the error after iteration ${context.iteration ?? "starts"}.`
    );
    sections.push("");

    const content = sections.join("\n");
    writeFileSync(filepath, content, "utf-8");

    return filepath;
  } catch (loggingError) {
    // Never let error logging itself crash the agent loop
    console.error(
      `[error-logger] Failed to write error log: ${loggingError instanceof Error ? loggingError.message : String(loggingError)}`
    );
    return null;
  }
}

/**
 * Build a reproduction command string for the error report.
 */
function buildReproCommand(context: ErrorContext): string {
  const parts = [
    "node dist/agent-loop.js",
    `--agent ${context.agentName}`,
    `--type ${context.agentType}`,
  ];

  if (context.config?.timeoutSeconds !== undefined) {
    parts.push(`--timeout ${context.config.timeoutSeconds}`);
  }
  if (context.config?.intervalSeconds !== undefined) {
    parts.push(`--interval ${context.config.intervalSeconds}`);
  }
  parts.push("--max-iterations 1");

  return parts.join(" ");
}
