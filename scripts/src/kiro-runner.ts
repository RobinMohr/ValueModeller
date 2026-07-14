/**
 * ACP client — spawns `kiro-cli acp` as a subprocess and communicates over
 * NDJSON/stdio using the Agent Client Protocol.
 *
 * Adapted from: https://github.com/aws-samples/sample-kiro-flock
 *
 * The main flow:
 *   1. create()  — spawn kiro-cli, wire up streams, establish an ACP session
 *   2. prompt()  — send a prompt, yield streaming updates as an async generator
 *   3. close()   — cancel the session and kill the subprocess
 */
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import type * as acp from "@agentclientprotocol/sdk";

export type SessionUpdateChunk = acp.SessionUpdate;

/** MCP server entry — matches the ACP SDK McpServerStdio shape. */
export interface McpServerEntry {
  name: string;
  command: string;
  args: string[];
  env: Array<{ name: string; value: string }>;
}

export interface KiroRunnerOptions {
  /** Agent name from .kiro/agents/ (e.g., "qa-improvement-agent") */
  agent: string;
  /** Working directory for the kiro-cli process */
  cwd: string;
  /** Optional model override */
  model?: string | null;
  /** Optional MCP servers to inject at session creation */
  mcpServers?: McpServerEntry[];
  /** Called when the agent streams text output */
  onText?: (text: string) => void;
  /** Called when a tool is invoked */
  onToolCall?: (name: string, status: string) => void;
  /** Called when the turn ends */
  onTurnEnd?: () => void;
}

/**
 * On Windows, convert a path containing spaces to its 8.3 short-name form.
 * This avoids "Cannot find module" errors when kiro-cli internally invokes
 * tools with unquoted workspace paths.
 *
 * Fallback strategy:
 *   1. Try cmd.exe 8.3 name expansion
 *   2. If that still has spaces, create a junction at %TEMP%\vm_agent_link
 *   3. If all else fails, return the original path
 */
function getShortPath(longPath: string): string {
  if (process.platform !== "win32") return longPath;
  if (!longPath.includes(" ")) return longPath;

  // Strategy 1: 8.3 short name via cmd
  try {
    const result = execSync(
      `cmd /c for %I in ("${longPath}") do @echo %~sI`,
      { encoding: "utf-8", timeout: 5000 }
    ).trim();
    if (result && !result.includes(" ") && !result.includes("\n")) {
      return result;
    }
  } catch {
    /* fall through */
  }

  // Strategy 2: NTFS junction in TEMP (space-free path)
  try {
    const { join } = require("node:path");
    const tempDir = process.env.TEMP || process.env.TMP || "C:\\Temp";
    const junctionPath = join(tempDir, "vm_agent_link");

    // Remove existing junction if present
    try {
      execSync(`cmd /c rmdir "${junctionPath}"`, { timeout: 3000, stdio: "ignore" });
    } catch { /* didn't exist */ }

    execSync(`cmd /c mklink /J "${junctionPath}" "${longPath}"`, {
      timeout: 5000,
      stdio: "ignore",
    });

    // Verify the junction was created and is space-free
    if (!junctionPath.includes(" ")) {
      return junctionPath;
    }
  } catch {
    /* fall through to original path */
  }

  return longPath;
}

export class KiroRunner {
  private proc: ChildProcess;
  private conn!: import("@agentclientprotocol/sdk").ClientSideConnection;
  private sessionId: string | null = null;

  private updateQueue: acp.SessionUpdate[] = [];
  private updateResolve: (() => void) | null = null;
  private turnDone = false;

  private constructor(proc: ChildProcess) {
    this.proc = proc;
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  static async create(opts: KiroRunnerOptions): Promise<KiroRunner> {
    const acpSdk = await import("@agentclientprotocol/sdk");

    // Forward essential env vars to the subprocess
    const env: Record<string, string> = {};
    const forwardKeys = [
      "PATH", "HOME", "HOMEDRIVE", "HOMEPATH", "USERPROFILE",
      "USER", "USERNAME", "SHELL", "TERM", "LANG", "NODE_ENV",
      "SSH_AUTH_SOCK", "APPDATA", "LOCALAPPDATA", "PROGRAMFILES",
      "SystemRoot", "TEMP", "TMP",
    ];
    for (const key of forwardKeys) {
      if (process.env[key]) env[key] = process.env[key]!;
    }
    env.NO_COLOR = "1";
    env.FORCE_COLOR = "0";

    // Forward AWS credentials and KIRO auth
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("AWS_")) env[key] = process.env[key]!;
    }
    if (process.env.KIRO_API_KEY) env.KIRO_API_KEY = process.env.KIRO_API_KEY;

    const args = ["acp", "--agent", opts.agent];
    if (opts.model) args.push("--model", opts.model);

    const cwd = getShortPath(resolve(opts.cwd));

    const proc = spawn("kiro-cli", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
      cwd,
      // On Windows we cannot use detached in the same way as Unix
      ...(process.platform !== "win32" ? { detached: true } : {}),
    });
    if (process.platform !== "win32") proc.unref();

    // Drain stderr to prevent backpressure (log it for debugging)
    proc.stderr?.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg) {
        process.stderr.write(`  [kiro-cli stderr] ${msg}\n`);
      }
    });

    const client = new KiroRunner(proc);
    const stdin = proc.stdin!;
    const stdout = proc.stdout!;

    // --- Writable side: serialize outgoing ACP messages to kiro-cli stdin ---
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        return new Promise<void>((resolve, reject) => {
          if (stdin.destroyed) return reject(new Error("stdin destroyed"));
          stdin.write(chunk, (err) => (err ? reject(err) : resolve()));
        });
      },
      close() {
        stdin.end();
      },
    });

    // --- Readable side: parse incoming NDJSON from kiro-cli stdout ---
    let buffer = "";
    const decoder = new TextDecoder();
    let ctrl!: ReadableStreamDefaultController<acp.AnyMessage>;
    const readable = new ReadableStream<acp.AnyMessage>({
      start(c) {
        ctrl = c;
      },
      cancel() {
        stdout.destroy();
      },
    });

    /**
     * Intercept Kiro extension notifications before they reach the SDK.
     * The SDK doesn't know about _kiro.dev/* methods and logs noisy errors.
     * We handle them here and only forward standard ACP messages to the SDK.
     */
    function handleMessage(msg: acp.AnyMessage): void {
      // Check if it's a Kiro extension notification
      if (
        "method" in msg &&
        typeof msg.method === "string" &&
        msg.method.startsWith("_kiro.dev/") &&
        !("id" in msg)
      ) {
        // Handle session updates — push to our queue
        if (msg.method === "_kiro.dev/session/update") {
          const params = (msg as { params?: Record<string, unknown> }).params;
          if (params && "update" in params) {
            client.updateQueue.push(params.update as acp.SessionUpdate);
            client.updateResolve?.();
            client.updateResolve = null;
          }
        }
        // All other _kiro.dev/* notifications are silently consumed
        // (mcp/server_initialized, commands/available, etc.)
        return;
      }
      // Standard ACP message — forward to SDK
      ctrl.enqueue(msg);
    }

    stdout.on("data", (chunk: Buffer) => {
      buffer += decoder.decode(new Uint8Array(chunk), { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          handleMessage(JSON.parse(trimmed));
        } catch {
          /* skip non-JSON lines */
        }
      }
    });
    stdout.on("end", () => {
      if (buffer.trim()) {
        try {
          handleMessage(JSON.parse(buffer.trim()));
        } catch {
          /* skip */
        }
      }
      try {
        ctrl.close();
      } catch {
        /* already closed */
      }
    });
    stdout.on("error", (err) => {
      try {
        ctrl.error(err);
      } catch {
        /* ignore */
      }
    });

    // Combine into ACP stream
    const dummyReadable = new ReadableStream<Uint8Array>({ start() {} });
    const ndJson = acpSdk.ndJsonStream(writable, dummyReadable);
    const stream: acp.Stream = { readable, writable: ndJson.writable };

    // --- ACP Client implementation ---
    const clientImpl: acp.Client = {
      async sessionUpdate(params: acp.SessionNotification): Promise<void> {
        client.updateQueue.push(params.update);
        client.updateResolve?.();
        client.updateResolve = null;
      },

      async requestPermission(
        params: acp.RequestPermissionRequest
      ): Promise<acp.RequestPermissionResponse> {
        // Auto-approve all tool permissions for autonomous operation
        const options = params.options;
        const approve =
          options.find((o) => o.kind === "allow_once") ??
          options.find((o) => o.kind === "allow_always") ??
          options[0];
        return { outcome: { outcome: "selected", optionId: approve.optionId } };
      },
    };

    client.conn = new acpSdk.ClientSideConnection(() => clientImpl, stream);

    // Handshake
    await client.conn.initialize({
      protocolVersion: acpSdk.PROTOCOL_VERSION,
      clientCapabilities: {},
    });

    const result = await client.conn.newSession({
      cwd,
      mcpServers: (opts.mcpServers ?? []) as unknown as acp.McpServerStdio[],
    });
    client.sessionId = result.sessionId;

    return client;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Send a prompt and yield streaming updates as they arrive. */
  async *prompt(text: string): AsyncGenerator<SessionUpdateChunk> {
    if (!this.sessionId) throw new Error("No active session");

    this.turnDone = false;
    this.updateQueue = [];

    const promptDone = this.conn
      .prompt({
        sessionId: this.sessionId,
        prompt: [{ type: "text" as const, text }],
      })
      .then(() => {
        this.turnDone = true;
        this.updateResolve?.();
      })
      .catch(() => {
        this.turnDone = true;
        this.updateResolve?.();
      });

    while (true) {
      while (this.updateQueue.length > 0) {
        yield this.updateQueue.shift()!;
      }
      if (this.turnDone) break;
      await new Promise<void>((resolve) => {
        this.updateResolve = resolve;
      });
    }

    // Drain remaining
    while (this.updateQueue.length > 0) {
      yield this.updateQueue.shift()!;
    }

    await promptDone;
  }

  /** Cancel the session and kill the kiro-cli subprocess. */
  async close(): Promise<void> {
    if (this.sessionId && this.proc.exitCode === null) {
      try {
        await this.conn.cancel({ sessionId: this.sessionId });
      } catch {
        /* connection may already be dead */
      }
    }
    if (this.proc.exitCode === null) {
      if (process.platform === "win32") {
        // On Windows, use taskkill to kill the process tree.
        // Wait for it to complete (and give the OS a moment to actually
        // release the process) so orphaned kiro-cli.exe instances don't
        // pile up across loop iterations.
        await new Promise<void>((resolve) => {
          const killer = spawn(
            "taskkill",
            ["/PID", String(this.proc.pid), "/T", "/F"],
            { stdio: "ignore" }
          );
          killer.on("exit", () => resolve());
          killer.on("error", () => resolve());
        });
      } else {
        this.proc.kill("SIGTERM");
      }
    }

    // Verify the process actually exited; wait briefly if not.
    const deadline = Date.now() + 5000;
    while (this.proc.exitCode === null && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** Check if the subprocess is still alive. */
  get isAlive(): boolean {
    return this.proc.exitCode === null;
  }

  /** Get the subprocess PID. */
  get pid(): number | undefined {
    return this.proc.pid;
  }
}
