import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, watch, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Parse JSON bodies for REST endpoints
app.use(express.json());

// Serve static frontend
app.use(express.static(join(__dirname, 'public')));

// ─── Tasks REST API ──────────────────────────────────────────────────────────
const TASKS_DIR = resolve(__dirname, '..', 'tasks');

/**
 * Generates a short unique task ID (8-char hex string).
 */
function generateTaskId() {
  return randomBytes(4).toString('hex');
}

function getTaskFilename(task) {
  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  const id = task.id || generateTaskId();
  return `${task.priority}_${id}_${slug}.json`;
}

function loadAllTasks() {
  if (!existsSync(TASKS_DIR)) return [];
  const files = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json') && !f.startsWith('0_task_template'));
  const tasks = [];
  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(join(TASKS_DIR, file), 'utf-8'));
      tasks.push({ ...content, _filename: file });
    } catch (e) {
      // skip malformed files
    }
  }
  return tasks.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

app.get('/api/tasks', (req, res) => {
  try {
    res.json(loadAllTasks());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:filename', (req, res) => {
  try {
    const filepath = join(TASKS_DIR, req.params.filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Task not found' });
    const content = JSON.parse(readFileSync(filepath, 'utf-8'));
    res.json({ ...content, _filename: req.params.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = req.body;
    if (!task.title || !task.priority) {
      return res.status(400).json({ error: 'title and priority are required' });
    }
    if (!existsSync(TASKS_DIR)) mkdirSync(TASKS_DIR, { recursive: true });
    // Assign a unique ID if not already present
    if (!task.id) task.id = generateTaskId();
    const filename = getTaskFilename(task);
    const filepath = join(TASKS_DIR, filename);
    const { _filename, ...taskData } = task;
    writeFileSync(filepath, JSON.stringify(taskData, null, 2) + '\n', 'utf-8');
    broadcast({ type: 'task-created', task: { ...taskData, _filename: filename } });
    res.status(201).json({ ...taskData, _filename: filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:filename', (req, res) => {
  try {
    const filepath = join(TASKS_DIR, req.params.filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Task not found' });
    const task = req.body;
    const { _filename, ...taskData } = task;
    // Preserve or extract the ID: use existing id field, or extract from filename, or generate new
    if (!taskData.id) {
      const idMatch = req.params.filename.match(/^\d+_([a-f0-9]{8})_/);
      taskData.id = idMatch ? idMatch[1] : generateTaskId();
    }
    writeFileSync(filepath, JSON.stringify(taskData, null, 2) + '\n', 'utf-8');
    const newFilename = getTaskFilename(taskData);
    if (newFilename !== req.params.filename) {
      const newFilepath = join(TASKS_DIR, newFilename);
      writeFileSync(newFilepath, JSON.stringify(taskData, null, 2) + '\n', 'utf-8');
      unlinkSync(filepath);
      broadcast({ type: 'task-updated', task: { ...taskData, _filename: newFilename }, oldFilename: req.params.filename });
      return res.json({ ...taskData, _filename: newFilename });
    }
    broadcast({ type: 'task-updated', task: { ...taskData, _filename: req.params.filename } });
    res.json({ ...taskData, _filename: req.params.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:filename', (req, res) => {
  try {
    const filepath = join(TASKS_DIR, req.params.filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Task not found' });
    unlinkSync(filepath);
    broadcast({ type: 'task-deleted', filename: req.params.filename });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ACP Helper for AI Task Generation ───────────────────────────────────────

/**
 * Spawns kiro-cli chat in non-interactive mode with the task-creator-agent.
 * Collects all stdout output and returns it as a string for JSON extraction.
 *
 * This replaces the previous ACP-based approach which was unreliable due to
 * protocol complexities and timing issues with streamed session updates.
 */
async function runTaskCreatorChat(userPrompt, cwd, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    let stdoutData = '';
    let stderrData = '';
    let resolved = false;

    const promptText = `Generate a task for: ${userPrompt}`;

    const proc = spawn('kiro-cli', [
      'chat',
      '--agent', 'task-creator-agent',
      '--trust-all-tools',
      '--no-interactive',
      '--wrap', 'never',
      promptText
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
    });

    // Close stdin immediately — non-interactive mode doesn't need input
    proc.stdin.end();

    // Timeout safety
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (proc.exitCode === null) {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
          } else {
            proc.kill('SIGTERM');
          }
        }
        // If we collected some output before timeout, try to use it
        if (stdoutData.trim()) {
          resolve(stdoutData);
        } else {
          reject(new Error('AI task generation timed out'));
        }
      }
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn kiro-cli: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);

        if (stderrData.trim()) {
          console.error('[ai-assist] kiro-cli stderr:', stderrData.trim().substring(0, 500));
        }

        if (stdoutData.trim()) {
          resolve(stdoutData);
        } else if (code !== 0) {
          reject(new Error(`kiro-cli exited with code ${code}. stderr: ${stderrData.trim().substring(0, 200) || '(empty)'}`));
        } else {
          reject(new Error('AI agent returned an empty response'));
        }
      }
    });
  });
}

// POST /api/tasks/generate — AI-assisted task generation via kiro-cli ACP

/**
 * Attempts to extract a valid task JSON object from the AI response text.
 * Uses multiple strategies to handle various agent output formats:
 * 1. Direct parse of the entire response
 * 2. Extract from markdown code fences (```json ... ``` or ``` ... ```)
 * 3. Find the last valid JSON object containing a "title" field
 * 4. Find any valid JSON object (non-greedy, iterating candidates)
 */
function extractTaskJson(text) {
  if (!text || !text.trim()) return null;

  // Clean the text: strip BOM, ANSI escape codes, zero-width characters
  const cleaned = text
    .replace(/^\uFEFF/, '')                    // BOM
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')   // ANSI escape codes
    .replace(/[\u200B-\u200D\uFEFF]/g, '');   // zero-width chars
  const trimmed = cleaned.trim();

  if (!trimmed) return null;

  // Strategy 1: Direct parse (agent responded with pure JSON)
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  // Strategy 2: Extract from markdown code fences
  const fencePatterns = [
    /```json\s*\n?([\s\S]*?)\n?\s*```/gi,
    /```\s*\n?([\s\S]*?)\n?\s*```/gi
  ];
  for (const pattern of fencePatterns) {
    let match;
    const fenceCandidates = [];
    while ((match = pattern.exec(trimmed)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          fenceCandidates.push(parsed);
        }
      } catch { /* try next match */ }
    }
    // Prefer fence candidates with "title" field (most likely the task)
    const withTitle = fenceCandidates.find(c => c.title);
    if (withTitle) return withTitle;
    if (fenceCandidates.length > 0) return fenceCandidates[fenceCandidates.length - 1];
  }

  // Strategy 3: Find JSON objects using balanced-brace scanner
  const candidates = findJsonCandidates(trimmed);

  // Score candidates: prefer objects that look like tasks
  // A task object has: title (required), plus optionally priority, type, description
  let bestCandidate = null;
  let bestScore = -1;

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

      // Score based on task-like fields
      let score = 0;
      if (parsed.title) score += 10;
      if (parsed.description) score += 5;
      if (parsed.priority && [1, 2, 3, 4].includes(parsed.priority)) score += 3;
      if (parsed.type && ['improvement', 'problem', 'idea'].includes(parsed.type)) score += 3;
      if (Array.isArray(parsed.files)) score += 2;
      // Bonus for later candidates (agent's final answer tends to be at the end)
      score += (i / candidates.length) * 2;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = parsed;
      }
    } catch { /* try next */ }
  }

  if (bestCandidate && bestScore >= 10) return bestCandidate;

  // Strategy 4: Fall back to any valid JSON object with a title
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (parsed && typeof parsed === 'object' && parsed.title) return parsed;
    } catch { /* try next */ }
  }

  // Strategy 5: Any valid JSON object at all (last resort)
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* try next */ }
  }

  return null;
}

/**
 * Scans text for balanced-brace JSON object candidates.
 * Returns an array of substrings that start with { and end with a matching }.
 * Focuses on finding likely task JSON objects (small, with expected fields).
 */
function findJsonCandidates(text) {
  const candidates = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escape = true;
          continue;
        }
        if (ch === '"' && !escape) {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') depth++;
          if (ch === '}') {
            depth--;
            if (depth === 0) {
              const candidate = text.slice(i, j + 1);
              // Only consider candidates that look like JSON objects (have a colon)
              // and are a reasonable size for a task object (< 10KB)
              if (candidate.includes(':') && candidate.length < 10000) {
                candidates.push(candidate);
              }
              break;
            }
          }
        }
      }
    }
  }
  return candidates;
}

app.post('/api/tasks/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const result = await runTaskCreatorChat(prompt.trim(), PROJECT_ROOT);

    if (!result || !result.trim()) {
      console.error('[ai-assist] Empty response from agent');
      throw new Error('AI agent returned an empty response. Please try again.');
    }

    // Try to extract JSON from the agent's response using multiple strategies
    let taskData;
    taskData = extractTaskJson(result);
    if (!taskData) {
      console.error('[ai-assist] Failed to parse AI response. Raw output length:', result.length);
      console.error('[ai-assist] First 1000 chars:', result.substring(0, 1000));
      console.error('[ai-assist] Last 500 chars:', result.substring(result.length - 500));
      throw new Error('Could not parse AI response as JSON');
    }

    // Validate and normalize the generated task
    if (!taskData.title) {
      throw new Error('AI did not generate a valid task (missing title)');
    }

    const task = {
      id: generateTaskId(),
      title: String(taskData.title).substring(0, 100),
      priority: [1, 2, 3, 4].includes(taskData.priority) ? taskData.priority : 2,
      type: ['improvement', 'problem', 'idea'].includes(taskData.type) ? taskData.type : 'improvement',
      description: String(taskData.description || prompt.trim()),
      state: 'todo',
      origin: 'user-assisted'
    };

    if (Array.isArray(taskData.files) && taskData.files.length > 0) {
      task.files = taskData.files.map(f => String(f)).filter(Boolean);
    }

    // Write the task file
    if (!existsSync(TASKS_DIR)) mkdirSync(TASKS_DIR, { recursive: true });
    const filename = getTaskFilename(task);
    const filepath = join(TASKS_DIR, filename);
    writeFileSync(filepath, JSON.stringify(task, null, 2) + '\n', 'utf-8');

    broadcast({ type: 'task-created', task: { ...task, _filename: filename } });
    res.status(201).json({ ...task, _filename: filename });
  } catch (err) {
    const userMessage = err.message || 'AI task generation failed';
    console.error('[ai-assist] Task generation error:', userMessage);
    // Provide a more helpful error message to the client
    const isParseError = userMessage.includes('parse') || userMessage.includes('JSON');
    const isTimeout = userMessage.includes('timed out');
    const isEmpty = userMessage.includes('empty');
    let clientError;
    if (isTimeout) {
      clientError = 'AI task generation timed out. The agent may be overloaded — please try again in a moment.';
    } else if (isEmpty) {
      clientError = 'AI agent returned an empty response. Please try again with a more detailed prompt.';
    } else if (isParseError) {
      clientError = 'AI generated a response but it could not be parsed as a valid task. Please try rephrasing your prompt with more specific requirements.';
    } else {
      clientError = userMessage;
    }
    res.status(500).json({ error: clientError });
  }
});

// ─── Errors REST API ─────────────────────────────────────────────────────────
const ERRORS_DIR_PATH = resolve(__dirname, '..', 'errors');

app.get('/api/errors', (req, res) => {
  try {
    if (!existsSync(ERRORS_DIR_PATH)) {
      return res.json([]);
    }
    const files = readdirSync(ERRORS_DIR_PATH)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse(); // newest first
    const errors = files.map(file => {
      const content = readFileSync(join(ERRORS_DIR_PATH, file), 'utf-8');
      // Extract metadata from the markdown content
      const timestampMatch = content.match(/\*\*Timestamp:\*\*\s*(.+)/);
      const agentMatch = content.match(/\*\*Agent:\*\*\s*(.+)/);
      const typeMatch = content.match(/\*\*Type:\*\*\s*(.+)/);
      const errorMatch = content.match(/## Error\s+```\s*([\s\S]*?)```/);
      return {
        filename: file,
        timestamp: timestampMatch ? timestampMatch[1].trim() : null,
        agent: agentMatch ? agentMatch[1].trim() : null,
        type: typeMatch ? typeMatch[1].trim() : null,
        errorSummary: errorMatch ? errorMatch[1].trim().substring(0, 200) : null
      };
    });
    res.json(errors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/errors/:filename', (req, res) => {
  try {
    const filepath = join(ERRORS_DIR_PATH, req.params.filename);
    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'Error file not found' });
    }
    // Prevent path traversal
    if (req.params.filename.includes('..') || req.params.filename.includes('/') || req.params.filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const content = readFileSync(filepath, 'utf-8');
    res.json({ filename: req.params.filename, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/errors/:filename', (req, res) => {
  try {
    if (req.params.filename.includes('..') || req.params.filename.includes('/') || req.params.filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = join(ERRORS_DIR_PATH, req.params.filename);
    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'Error file not found' });
    }
    unlinkSync(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/errors', (req, res) => {
  try {
    if (!existsSync(ERRORS_DIR_PATH)) {
      return res.json({ success: true, deleted: 0 });
    }
    const files = readdirSync(ERRORS_DIR_PATH).filter(f => f.endsWith('.md'));
    for (const file of files) {
      unlinkSync(join(ERRORS_DIR_PATH, file));
    }
    res.json({ success: true, deleted: files.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agents REST API (CRUD) ─────────────────────────────────────────────────
const AGENTS_CONFIG_PATH = join(__dirname, 'agents.json');
const PROJECT_ROOT = resolve(__dirname, '..');
const AGENT_LOOP_SCRIPT = resolve(PROJECT_ROOT, 'scripts', 'dist', 'agent-loop.js');

function loadAgentsConfig() {
  if (existsSync(AGENTS_CONFIG_PATH)) {
    return JSON.parse(readFileSync(AGENTS_CONFIG_PATH, 'utf-8'));
  }
  return [];
}

function saveAgentsConfig(configs) {
  writeFileSync(AGENTS_CONFIG_PATH, JSON.stringify(configs, null, 2) + '\n', 'utf-8');
}

function generateAgentId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
}

// GET /api/agents — list all agent configs
app.get('/api/agents', (req, res) => {
  try {
    const configs = loadAgentsConfig();
    // Merge with runtime status
    const result = configs.map(config => {
      const runtime = agents.get(config.id);
      return {
        ...config,
        status: runtime ? runtime.status : 'stopped',
        startedAt: runtime ? runtime.startedAt : null,
        currentActivity: runtime ? runtime.currentActivity : null
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id — get single agent config
app.get('/api/agents/:id', (req, res) => {
  try {
    const configs = loadAgentsConfig();
    const config = configs.find(c => c.id === req.params.id);
    if (!config) return res.status(404).json({ error: 'Agent not found' });
    const runtime = agents.get(config.id);
    res.json({
      ...config,
      status: runtime ? runtime.status : 'stopped',
      startedAt: runtime ? runtime.startedAt : null,
      currentActivity: runtime ? runtime.currentActivity : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents — create a new agent
app.post('/api/agents', (req, res) => {
  try {
    const { name, type, agent, description, intervalSeconds, timeoutSeconds, maxIterations, customPrompt } = req.body;

    if (!name || !type || !agent) {
      return res.status(400).json({ error: 'name, type, and agent are required' });
    }

    const validTypes = ['dev', 'qa', 'task-order', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const configs = loadAgentsConfig();
    const id = generateAgentId(name);

    // Check for duplicate IDs
    if (configs.find(c => c.id === id)) {
      return res.status(409).json({ error: `Agent with id '${id}' already exists` });
    }

    const newAgent = {
      id,
      name,
      type,
      agent,
      description: description || '',
      intervalSeconds: intervalSeconds ?? 0,
      timeoutSeconds: timeoutSeconds ?? 900,
      maxIterations: maxIterations ?? 0,
      ...(type === 'custom' && customPrompt ? { customPrompt } : {})
    };

    configs.push(newAgent);
    saveAgentsConfig(configs);

    // Register in runtime
    agents.set(id, {
      config: newAgent,
      process: null,
      status: 'stopped',
      output: [],
      startedAt: null,
      currentActivity: null
    });

    broadcast({ type: 'agent-created', agent: { ...newAgent, status: 'stopped' } });
    res.status(201).json({ ...newAgent, status: 'stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/:id — update an agent config
app.put('/api/agents/:id', (req, res) => {
  try {
    const configs = loadAgentsConfig();
    const idx = configs.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });

    const runtime = agents.get(req.params.id);
    if (runtime && runtime.status === 'running') {
      return res.status(409).json({ error: 'Cannot update a running agent. Stop it first.' });
    }

    const { name, type, agent, description, intervalSeconds, timeoutSeconds, maxIterations, customPrompt } = req.body;

    const updated = {
      ...configs[idx],
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(agent !== undefined ? { agent } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(intervalSeconds !== undefined ? { intervalSeconds } : {}),
      ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
      ...(maxIterations !== undefined ? { maxIterations } : {}),
      ...(customPrompt !== undefined ? { customPrompt } : {}),
    };

    // Remove customPrompt if type is not custom
    if (updated.type !== 'custom') {
      delete updated.customPrompt;
    }

    configs[idx] = updated;
    saveAgentsConfig(configs);

    // Update runtime config
    if (runtime) {
      runtime.config = updated;
    } else {
      agents.set(req.params.id, {
        config: updated,
        process: null,
        status: 'stopped',
        output: [],
        startedAt: null,
        currentActivity: null
      });
    }

    broadcast({ type: 'agent-updated', agent: { ...updated, status: runtime ? runtime.status : 'stopped' } });
    res.json({ ...updated, status: runtime ? runtime.status : 'stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agents/:id — delete an agent
app.delete('/api/agents/:id', (req, res) => {
  try {
    const configs = loadAgentsConfig();
    const idx = configs.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Agent not found' });

    const runtime = agents.get(req.params.id);
    if (runtime && runtime.status === 'running') {
      // Stop it first (with rollback since it's being forcefully terminated)
      stopAgent(req.params.id, { rollback: true });
    }

    configs.splice(idx, 1);
    saveAgentsConfig(configs);
    agents.delete(req.params.id);

    broadcast({ type: 'agent-deleted', agentId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent-types — list available agent types for the UI
app.get('/api/agent-types', (req, res) => {
  res.json([
    { id: 'dev', name: 'Developer', description: 'Implements tasks from the backlog one at a time', defaultAgent: 'developer-agent', defaultTimeout: 900, defaultInterval: 0 },
    { id: 'qa', name: 'QA / Research', description: 'Tests the app and researches improvements', defaultAgent: 'qa-improvement-agent', defaultTimeout: 600, defaultInterval: 30 },
    { id: 'task-order', name: 'Task Prioritization', description: 'Re-evaluates and re-orders task priorities', defaultAgent: 'task-order-agent', defaultTimeout: 300, defaultInterval: 0 },
    { id: 'custom', name: 'Custom', description: 'Run any agent with a custom prompt', defaultAgent: '', defaultTimeout: 600, defaultInterval: 0 }
  ]);
});

// ─── Agent Process Management ────────────────────────────────────────────────

const agents = new Map(); // id -> { config, process, status, output[], startedAt, currentActivity }
const MAX_OUTPUT_LINES = 1000;

// ─── Agent Activity Tracking ─────────────────────────────────────────────────

/**
 * Determines the current activity for a dev agent by checking tasks/ for in-progress tasks.
 */
function getDevAgentActivity() {
  try {
    if (!existsSync(TASKS_DIR)) return null;
    const files = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json') && !f.startsWith('0_task_template'));
    for (const file of files) {
      try {
        const content = JSON.parse(readFileSync(join(TASKS_DIR, file), 'utf-8'));
        if (content.state === 'in-progress') {
          return { type: 'working', task: content.title };
        }
      } catch { /* skip malformed */ }
    }
    return { type: 'idle', task: null };
  } catch {
    return null;
  }
}

/**
 * Parses QA agent output to determine current activity state.
 * Looks at recent output lines for indicators of waiting vs active testing.
 */
function parseQaAgentActivity(outputLines) {
  if (!outputLines || outputLines.length === 0) return { type: 'idle', task: null };

  // Look at the last 20 lines for context
  const recent = outputLines.slice(-20);

  for (let i = recent.length - 1; i >= 0; i--) {
    const text = (recent[i].text || '').toLowerCase();

    // Detect waiting/sleeping state
    if (text.includes('next iteration in') || text.includes('waiting') || text.includes('sleeping')) {
      return { type: 'waiting', task: null };
    }
    // Detect active testing via Puppeteer
    if (text.includes('puppeteer') || text.includes('navigate') || text.includes('screenshot') || text.includes('testing')) {
      return { type: 'testing', task: 'Browser testing' };
    }
    // Detect research activity
    if (text.includes('web_search') || text.includes('web_fetch') || text.includes('research')) {
      return { type: 'researching', task: 'Researching improvements' };
    }
    // Detect task creation
    if (text.includes('task-created') || text.includes('creating task') || text.includes('writing task')) {
      return { type: 'creating-tasks', task: 'Writing findings' };
    }
    // Detect active iteration
    if (text.includes('iteration') && text.includes('===')) {
      return { type: 'active', task: 'Running QA cycle' };
    }
  }

  return { type: 'active', task: null };
}

/**
 * Updates and broadcasts the current activity for an agent.
 */
function updateAgentActivity(agentId) {
  const agent = agents.get(agentId);
  if (!agent || agent.status !== 'running') {
    if (agent) {
      const prev = JSON.stringify(agent.currentActivity);
      agent.currentActivity = null;
      if (prev !== JSON.stringify(null)) {
        broadcast({ type: 'activity', agentId, activity: null });
      }
    }
    return;
  }

  let newActivity = null;
  const { config } = agent;

  if (config.type === 'dev') {
    newActivity = getDevAgentActivity();
  } else if (config.type === 'qa') {
    newActivity = parseQaAgentActivity(agent.output);
  } else if (config.type === 'task-order') {
    // Task-order agent is always just "re-prioritizing"
    newActivity = { type: 'working', task: 'Re-prioritizing tasks' };
  }

  // Only broadcast if activity changed
  const prev = JSON.stringify(agent.currentActivity);
  const next = JSON.stringify(newActivity);
  if (prev !== next) {
    agent.currentActivity = newActivity;
    broadcast({ type: 'activity', agentId, activity: newActivity });
  }
}

/**
 * Log an agent error to the errors/ folder as a markdown file.
 * Called when an agent process crashes or encounters a breaking error.
 */
function logAgentErrorToFile(agentId, agentConfig, errorMessage, output = []) {
  try {
    if (!existsSync(ERRORS_DIR_PATH)) mkdirSync(ERRORS_DIR_PATH, { recursive: true });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const slug = (agentConfig.type || 'unknown').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${timestamp}_${slug}.md`;
    const filepath = join(ERRORS_DIR_PATH, filename);

    const lastLines = output
      .slice(-50)
      .map(entry => `[${entry.stream}] ${entry.text}`)
      .join('\n');

    const content = [
      '# Agent Error Report',
      '',
      `**Timestamp:** ${now.toISOString()}`,
      `**Agent:** ${agentConfig.agent || agentId}`,
      `**Type:** ${agentConfig.type || 'unknown'}`,
      `**Name:** ${agentConfig.name || agentId}`,
      '',
      '## Error',
      '',
      '```',
      errorMessage,
      '```',
      '',
      '## Agent Configuration',
      '',
      '| Parameter | Value |',
      '|-----------|-------|',
      `| Timeout | ${agentConfig.timeoutSeconds ?? 900}s |`,
      `| Interval | ${agentConfig.intervalSeconds ?? 0}s |`,
      `| Max Iterations | ${agentConfig.maxIterations ?? 0} |`,
      '',
      '## Working Directory',
      '',
      '```',
      PROJECT_ROOT,
      '```',
      '',
      ...(lastLines ? [
        '## Last Agent Output (before error)',
        '',
        '```',
        lastLines,
        '```',
        '',
      ] : []),
      '## How to Reproduce',
      '',
      '1. Navigate to the project root:',
      '   ```bash',
      `   cd "${PROJECT_ROOT}"`,
      '   ```',
      '2. Run the agent:',
      '   ```bash',
      `   node scripts/dist/agent-loop.js --agent ${agentConfig.agent || agentId} --type ${agentConfig.type || 'dev'} --timeout ${agentConfig.timeoutSeconds ?? 900} --max-iterations 1`,
      '   ```',
      '3. Observe the error.',
      '',
    ].join('\n');

    writeFileSync(filepath, content, 'utf-8');
    console.log(`[error-logger] Error logged to: ${filepath}`);
  } catch (loggingErr) {
    console.error(`[error-logger] Failed to log error: ${loggingErr.message}`);
  }
}

function initAgents() {
  const configs = loadAgentsConfig();
  for (const config of configs) {
    if (!agents.has(config.id)) {
      agents.set(config.id, {
        config,
        process: null,
        status: 'stopped',
        output: [],
        startedAt: null,
        currentActivity: null
      });
    }
  }
}

initAgents();

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  }
}

function startAgent(agentId) {
  const agent = agents.get(agentId);
  if (!agent) return { error: 'Agent not found' };
  if (agent.status === 'running') return { error: 'Agent already running' };

  const { config } = agent;

  // Build the command args for the unified agent-loop
  const args = [
    '--experimental-specifier-resolution=node',
    AGENT_LOOP_SCRIPT,
    '--agent', config.agent,
    '--type', config.type,
    '--interval', String(config.intervalSeconds ?? 0),
    '--timeout', String(config.timeoutSeconds ?? 900),
    '--max-iterations', String(config.maxIterations ?? 0),
  ];

  // For custom agents, pass the custom prompt
  if (config.type === 'custom' && config.customPrompt) {
    args.push('--prompt', config.customPrompt);
  }

  try {
    // NOTE: Do NOT use shell: true here. When shell is true, paths with spaces
    // in args get split by the shell, causing "Cannot find module" errors.
    // spawn() without shell passes args directly to the process, handling spaces natively.
    const proc = spawn('node', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env }
    });

    agent.process = proc;
    agent.status = 'running';
    agent.startedAt = new Date().toISOString();
    agent.output = [];
    agent.currentActivity = config.type === 'task-order'
      ? { type: 'working', task: 'Re-prioritizing tasks' }
      : { type: 'active', task: null };

    // Buffer partial writes per stream so we only emit complete lines.
    // agent-loop.ts streams LLM text token-by-token via process.stdout.write()
    // with no trailing newline, so each OS-level pipe "data" event can be a
    // tiny fragment (a word, or even part of one) rather than a full line.
    // Without buffering, every fragment got its own timestamped log entry,
    // producing garbled one-word-per-line output in the UI.
    const streamBuffers = { stdout: '', stderr: '' };

    const flushLine = (stream, line) => {
      if (line === '') return;
      const entry = {
        timestamp: new Date().toISOString(),
        stream,
        text: line
      };
      agent.output.push(entry);
      if (agent.output.length > MAX_OUTPUT_LINES) {
        agent.output.shift();
      }
      broadcast({ type: 'output', agentId, entry });

      // Update activity for QA agents based on output content
      if (config.type === 'qa') {
        updateAgentActivity(agentId);
      }
    };

    const handleOutput = (stream) => (data) => {
      streamBuffers[stream] += data.toString();
      const parts = streamBuffers[stream].split('\n');
      // Last part is incomplete (no trailing newline yet) — keep it buffered.
      streamBuffers[stream] = parts.pop() ?? '';
      for (const line of parts) {
        flushLine(stream, line);
      }
    };

    proc.stdout.on('data', handleOutput('stdout'));
    proc.stderr.on('data', handleOutput('stderr'));

    proc.on('close', (code) => {
      // Flush any trailing partial line left in the buffers (e.g. output
      // that didn't end with a newline before the process exited).
      flushLine('stdout', streamBuffers.stdout);
      flushLine('stderr', streamBuffers.stderr);
      streamBuffers.stdout = '';
      streamBuffers.stderr = '';

      agent.status = 'stopped';
      agent.process = null;
      agent.currentActivity = null;
      const entry = {
        timestamp: new Date().toISOString(),
        stream: 'system',
        text: `Process exited with code ${code}`
      };
      agent.output.push(entry);
      broadcast({ type: 'output', agentId, entry });
      broadcast({ type: 'status', agentId, status: 'stopped', exitCode: code });
      broadcast({ type: 'activity', agentId, activity: null });

      // Log non-zero exit codes as errors to errors/ folder
      if (code !== 0 && code !== null) {
        logAgentErrorToFile(
          agentId,
          config,
          `Agent process exited with non-zero code: ${code}`,
          agent.output
        );
      }
    });

    proc.on('error', (err) => {
      agent.status = 'error';
      agent.process = null;
      const entry = {
        timestamp: new Date().toISOString(),
        stream: 'system',
        text: `Error: ${err.message}`
      };
      agent.output.push(entry);
      broadcast({ type: 'output', agentId, entry });
      broadcast({ type: 'status', agentId, status: 'error', error: err.message });

      // Log process spawn/runtime errors to errors/ folder
      logAgentErrorToFile(
        agentId,
        config,
        `Process error: ${err.message}\n\nStack: ${err.stack || 'No stack trace'}`,
        agent.output
      );
    });

    broadcast({ type: 'status', agentId, status: 'running', startedAt: agent.startedAt });
    return { success: true };
  } catch (err) {
    agent.status = 'error';
    return { error: err.message };
  }
}

function stopAgent(agentId, options = {}) {
  const agent = agents.get(agentId);
  if (!agent) return { error: 'Agent not found' };
  if (agent.status !== 'running' || !agent.process) return { error: 'Agent not running' };

  // On Windows, use taskkill to kill the process tree
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(agent.process.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    agent.process.kill('SIGTERM');
    setTimeout(() => {
      if (agent.process && !agent.process.killed) {
        agent.process.kill('SIGKILL');
      }
    }, 5000);
  }

  // Perform rollback if requested
  if (options.rollback) {
    performRollback(agentId, agent.config);
  }

  return { success: true };
}

/**
 * Performs a rollback when an agent is forcefully killed:
 * 1. Resets any in-progress tasks back to "todo"
 * 2. Reverts uncommitted git changes via `git checkout .`
 */
function performRollback(agentId, agentConfig) {
  const rollbackLog = [];

  // Step 1: Reset in-progress tasks back to "todo"
  try {
    if (existsSync(TASKS_DIR)) {
      const files = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json') && !f.startsWith('0_task_template'));
      for (const file of files) {
        try {
          const filepath = join(TASKS_DIR, file);
          const task = JSON.parse(readFileSync(filepath, 'utf-8'));
          if (task.state === 'in-progress') {
            task.state = 'todo';
            writeFileSync(filepath, JSON.stringify(task, null, 2) + '\n', 'utf-8');
            rollbackLog.push(`Reset task "${task.title}" (${file}) from in-progress → todo`);
          }
        } catch (e) {
          // skip malformed files
        }
      }
    }
  } catch (e) {
    rollbackLog.push(`Error resetting tasks: ${e.message}`);
  }

  // Step 2: Revert uncommitted git changes
  try {
    const gitCheckout = spawn('git', ['checkout', '.'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });

    gitCheckout.on('close', (code) => {
      if (code === 0) {
        rollbackLog.push('Git changes reverted (git checkout .)');
      } else {
        rollbackLog.push(`Git checkout exited with code ${code}`);
      }

      // Broadcast rollback results
      broadcast({
        type: 'rollback',
        agentId,
        log: rollbackLog
      });
    });

    gitCheckout.on('error', (err) => {
      rollbackLog.push(`Git checkout error: ${err.message}`);
      broadcast({
        type: 'rollback',
        agentId,
        log: rollbackLog
      });
    });
  } catch (e) {
    rollbackLog.push(`Error reverting git changes: ${e.message}`);
    broadcast({
      type: 'rollback',
      agentId,
      log: rollbackLog
    });
  }

  // Also broadcast task changes so UI updates immediately
  broadcast({ type: 'tasks-changed' });
}

function getAgentsList() {
  const list = [];
  for (const [id, agent] of agents) {
    list.push({
      id,
      name: agent.config.name,
      type: agent.config.type,
      agent: agent.config.agent,
      description: agent.config.description,
      intervalSeconds: agent.config.intervalSeconds,
      timeoutSeconds: agent.config.timeoutSeconds,
      maxIterations: agent.config.maxIterations,
      status: agent.status,
      startedAt: agent.startedAt,
      outputLineCount: agent.output.length,
      currentActivity: agent.currentActivity
    });
  }
  return list;
}

// ─── WebSocket ───────────────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'init',
    agents: getAgentsList()
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.action) {
        case 'start': {
          const result = startAgent(msg.agentId);
          ws.send(JSON.stringify({ type: 'response', action: 'start', agentId: msg.agentId, ...result }));
          break;
        }
        case 'stop': {
          const result = stopAgent(msg.agentId, { rollback: !!msg.rollback });
          ws.send(JSON.stringify({ type: 'response', action: 'stop', agentId: msg.agentId, rollback: !!msg.rollback, ...result }));
          break;
        }
        case 'getOutput': {
          const agent = agents.get(msg.agentId);
          if (agent) {
            ws.send(JSON.stringify({ type: 'history', agentId: msg.agentId, output: agent.output }));
          }
          break;
        }
        case 'reload': {
          initAgents();
          ws.send(JSON.stringify({ type: 'init', agents: getAgentsList() }));
          break;
        }
        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown action: ${msg.action}` }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });
});

// ─── Watch tasks/ folder ─────────────────────────────────────────────────────
if (existsSync(TASKS_DIR)) {
  let debounceTimer = null;
  watch(TASKS_DIR, { persistent: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.json')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      broadcast({ type: 'tasks-changed' });
      // Update activity for all running dev agents when tasks change
      for (const [id, agent] of agents) {
        if (agent.config.type === 'dev' && agent.status === 'running') {
          updateAgentActivity(id);
        }
      }
    }, 300);
  });
}

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3500;

// Allow importing for tests without auto-starting
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`TecFactory running at http://localhost:${PORT}`);
  });
}

export { app, server, wss, loadAllTasks, getTaskFilename, generateTaskId, extractTaskJson, findJsonCandidates, parseQaAgentActivity, agents, broadcast, TASKS_DIR };
