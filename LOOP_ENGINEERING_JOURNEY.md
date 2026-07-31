# Loop Engineering with Kiro

An experience report on running AI agents in continuous loops. We built this during a two-day hackathon against a local React project. It's a prototype with human oversight, short-lived branches, timeouts, and recoverable tasks. Not a production-ready autonomous development system.

---

## What We Mean by Loop Engineering

Give an AI agent a task. Let it finish. Give it the next one. The core concept is almost embarrassingly simple:

```
while (true) {
  task = getNextTask()
  spawn kiro-cli acp --agent developer --prompt task.description
  wait for completion
}
```

That works. You could stop here and have something useful. But to make it run reliably without constant supervision, you end up adding restrictions, error recovery, role boundaries, and structured task contracts. The rest of this document covers what we added and why.

---

## How We Got Here

We started the hackathon normally. Open Kiro, type what you want, watch it build. One feature per interactive session. This worked for the first dozen features, but managing multiple sessions in parallel became the real bottleneck. We'd have several agent sessions running at once, and they'd sit idle because it was hard to context-switch between them all in the IDE.

So we moved the orchestration outside the IDE. A script claims tasks from a shared backlog and spawns agent sessions programmatically. We kept using Kiro interactively for tasks that needed more specific instructions, while the loop handled the well-defined ones in the background.

---

## How It Works Now: Our Current Prototype

### The Core Loop

```
while (true) {
  1. Find the highest-priority task in the backlog
  2. Claim it (file lock, set state to in-progress)
  3. Spawn a fresh Kiro agent session via ACP
  4. Give it a focused prompt: "implement THIS specific task"
  5. Wait for completion (or timeout after 15 minutes)
  6. Commit the result
  7. Repeat
}
```

For developer work, our default unit is one task, one fresh agent invocation, and one validated commit. QA and research runs produce reports or backlog entries rather than feature commits.

### The Multi-Agent Setup

| Agent | Role | Output |
|-------|------|--------|
| **Developer** | Implements one task, runs the build, marks it done | Commits to `develop` |
| **QA** | Tests the running app with headless Puppeteer, finds bugs | New task files |
| **Information Collector** | Searches the web for research | Findings written to a file |

Agents never talk to each other directly. They communicate through task files on disk:

```
Human creates tasks ──┐
                      ├──> tasks/*.json <──┐
QA agent creates tasks ──┘                 │
                                           │
Dev agent reads tasks, implements, marks done
```

### What Makes It More Than a While Loop

1. **Structured task contracts:** JSON files with explicit schema (title, priority, state, files, description).
2. **Atomic task claiming:** file locks prevent two agents from grabbing the same work.
3. **Role-specific instructions:** prompts define what each agent is responsible for.
4. **Tool-level restrictions:** agent permissions limit what each role can actually read, write, and execute.
5. **Timeout and error recovery:** crashed iterations don't poison the system.
6. **State machines:** tasks transition through `todo -> in-progress -> developed`.

The instruction tells the QA agent not to modify application code. More importantly, the QA agent profile does not receive general write access to `src/`. Its writable output is limited to task reports and improvement notes.

### Non-Interactive Permissions

Autonomous sessions cannot pause for a human approval dialog. Each agent therefore receives only the tool categories required for its role. Destructive shell commands, secret files, and unrelated directories are explicitly denied. We only use unrestricted tool approval in disposable local environments.

### The ACP Client

The heart of the system is `KiroRunner`, a TypeScript class that spawns `kiro-cli acp` as a subprocess and communicates over NDJSON/stdio. The ACP SDK (`@agentclientprotocol/sdk`) handles the protocol handshake, session creation, and message framing. Our wrapper adds lifecycle management: spawn, monitor, timeout, kill.

### Task Design

Every task is a JSON file in `tasks/`:

```json
{
  "title": "Short descriptive title",
  "priority": 1,
  "type": "problem",
  "state": "todo",
  "description": "Specific enough for an agent to implement without asking questions",
  "files": ["src/components/canvas/flow-canvas.tsx"],
  "origin": "user"
}
```

The `files` field hints the agent where to look. Without it, the agent spends its first 60 seconds figuring out which file to open. The `origin` field tracks whether a human or an AI created the task.

Files are named `[priority]_[hash]_[kebab-title].json`. The priority prefix makes `ls` sort them naturally.

### The Human's Role

Loop engineering changes what the human does. Instead of writing code, you describe intent, curate priorities, and course-correct when agents drift. Over the course of our project, the human filed about 55 tasks directly. The QA agent filed another 40 autonomously. Both fed into the same backlog.

The orchestration code is about 900 lines of TypeScript, but it's just plumbing. The actual intelligence lives in the agent instruction markdown files. We iterated on those instructions more than on any source file in the project.

---

## Lessons Learned

### One Task Per Invocation

**Observed:** When the dev agent handled multiple tasks in one session, it mixed up context, produced tangled commits, and had higher failure rates.

**Cause:** Shared context between unrelated tasks leads to interference. One bad task poisons the whole session. And longer sessions burn more credits and risk hitting the context window limit.

**Fix:** Spawn a fresh agent, give it ONE task, let it finish, kill the session. Clean slate every time. This also keeps credit usage predictable and the context window small enough that we rarely worry about it.

### Duplicate QA Reports

**Observed:** The QA agent repeatedly filed the same dark-mode issue.

**Cause:** It did not inspect the existing backlog before creating a task.

**Immediate fix:** One sentence in the instructions: "you MUST read existing tasks before creating new ones."

**Remaining limitation:** Semantic duplicates can still be filed when two reports use different wording.

**Next improvement:** Generate a normalised issue fingerprint from component, route, error type, and reproduction steps.

### Headless Puppeteer Is Mandatory

**Observed:** The QA agent launched a visible Chrome window. In autonomous mode, nothing closes that window. The process hung forever.

**Cause:** Puppeteer defaults to a visible browser. The agent completed its testing but never exited because the browser process was still alive.

**Fix:** Force headless mode on the first `puppeteer_navigate` call.

### QA Agent Writing Source Code

**Observed:** The QA agent occasionally "helped" by fixing bugs directly, conflicting with the dev agent on the same branch.

**Cause:** It had `"tools": ["*"]` with no write restrictions.

**Fix:** Explicit tool allowlists and write-access restrictions. The QA agent can only write to `tasks/*.json` and `IMPROVEMENTS.md`.

### Stale Git Staging on Windows

**Observed:** `git add .` re-staged task files with CRLF changes from prior iterations, causing stale task titles to leak into commit messages.

**Cause:** Windows line-ending normalization affected files touched in earlier loop iterations.

**Fix:** Pass the claimed task title directly to the commit function instead of scanning staged files.

### Stale Lock Recovery

**Observed:** If the loop crashes mid-task (Ctrl+C, power failure), a `.lock` file remains and the task stays stuck in `in-progress`.

**Cause:** No cleanup on abnormal termination.

**Fix:** On startup, check all locks. If a lock is older than 20 minutes, delete it and reset the task to `todo`.

### Context-First Prompting

**Observed:** Without explicit instructions to read project files first, agents make decisions in a vacuum. They reimplement things that already exist or create tasks for solved problems.

**Fix:** Every agent's instructions begin with "ALWAYS START by reading these files:" followed by a specific file list.

---

## Known Limitations

- Prompt instructions are not a security sandbox. A sufficiently creative agent can work around written constraints.
- Our mostly single-worker run did not fully validate concurrent task claiming.
- The current prototype still tests a mutable working directory. This creates a race condition when development changes occur during a QA run.
- Task files do not provide database-level transactions. Conflicts are possible under heavy concurrent writes.
- A successful agent response does not prove that the implementation is correct.
- Generated tests can reproduce the same incorrect assumptions as generated code.
- Unrestricted shell or network access can expose credentials and local data.
- Cost and token consumption were not fully measured during the hackathon.
- The approach still requires human review before merging or deployment.

---

## Infrastructure at a Glance

```
scripts/
  src/
    agent-loop.ts      # Main loop orchestrator (~900 lines)
    kiro-runner.ts     # ACP client wrapper (~390 lines)
    error-logger.ts    # Structured error reports

.kiro/
  agents/
    developer-agent.json + .md
    qa-improvement-agent.json + .md
    task-order-agent.json + .md
    information-collector-agent.json + .md

tasks/                 # Shared backlog (JSON files)
errors/                # Structured error reports from failed iterations
```

Dependencies are minimal: `@agentclientprotocol/sdk` for protocol framing, `typescript` for type safety, and `kiro-cli` installed globally.

### Running It

The loop is operated through a small web UI. Build and start it:

```bash
cd TecFactory && npm run build
npm run dev
```

From the UI you create agents, file tasks, and watch progress. The CLI handles execution in the background, but the day-to-day interaction is through the browser.

---

## What We'd Do Differently

- **Task dependencies:** a `blocked_by` field so the loop doesn't attempt work that depends on unfinished prerequisites.
- **Cost tracking:** log token usage per iteration to understand spend.
- **File-watcher instead of polling:** watch `tasks/` for changes instead of polling every 60 seconds.
- **Parallel dev agents:** we built the locking infrastructure for it but mostly ran one at a time.
- **Immutable QA target:** QA should test against a specific commit, not the live working directory.
