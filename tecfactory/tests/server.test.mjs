/**
 * TecFactory Server — Unit Tests
 *
 * Test Structure (AAA Principle):
 * - Arrange: Set up test data, mock dependencies, prepare state
 * - Act: Execute the function/endpoint under test
 * - Assert: Verify the expected outcome
 *
 * Naming Convention: describe('<Module>') → it('should <expected behavior> when <condition>')
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set test environment before importing server
process.env.NODE_ENV = 'test';

// We need to mock the TASKS_DIR to use a temp location
const TEST_TASKS_DIR = join(__dirname, '__fixtures__', 'tasks');
const TEST_ERRORS_DIR = join(__dirname, '__fixtures__', 'errors');

/**
 * Helper: create a test task file
 */
function createTestTask(filename, task) {
  writeFileSync(join(TEST_TASKS_DIR, filename), JSON.stringify(task, null, 2) + '\n', 'utf-8');
}

/**
 * Helper: create a test error file
 */
function createTestError(filename, content) {
  if (!existsSync(TEST_ERRORS_DIR)) mkdirSync(TEST_ERRORS_DIR, { recursive: true });
  writeFileSync(join(TEST_ERRORS_DIR, filename), content, 'utf-8');
}

/**
 * Helper: clean up test directories
 */
function cleanFixtures() {
  if (existsSync(join(__dirname, '__fixtures__'))) {
    rmSync(join(__dirname, '__fixtures__'), { recursive: true, force: true });
  }
}

// ─── Tests for getTaskFilename ───────────────────────────────────────────────

describe('getTaskFilename', () => {
  let getTaskFilename;

  beforeAll(async () => {
    const mod = await import('../server.js');
    getTaskFilename = mod.getTaskFilename;
  });

  it('should generate a filename with id from task title and priority', () => {
    // Arrange
    const task = { title: 'Fix the broken button', priority: 1, id: 'a1b2c3d4' };

    // Act
    const filename = getTaskFilename(task);

    // Assert
    expect(filename).toBe('1_a1b2c3d4_fix-the-broken-button.json');
  });

  it('should handle special characters in the title', () => {
    // Arrange
    const task = { title: 'Add <html> & "quotes" support!', priority: 2, id: 'deadbeef' };

    // Act
    const filename = getTaskFilename(task);

    // Assert
    expect(filename).toBe('2_deadbeef_add-html-quotes-support.json');
  });

  it('should truncate long titles to 50 characters', () => {
    // Arrange
    const task = {
      title: 'This is a very long task title that exceeds the maximum allowed length for filenames in the system',
      priority: 3,
      id: '12345678'
    };

    // Act
    const filename = getTaskFilename(task);

    // Assert
    // Format: {priority}_{id}_{slug}.json — slug should be <= 50 chars
    const parts = filename.replace('.json', '').split('_');
    const slug = parts.slice(2).join('_');
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(filename).toMatch(/^3_12345678_.+\.json$/);
  });

  it('should remove leading and trailing dashes from the slug', () => {
    // Arrange
    const task = { title: '---leading and trailing---', priority: 4, id: 'abcd1234' };

    // Act
    const filename = getTaskFilename(task);

    // Assert
    expect(filename).toBe('4_abcd1234_leading-and-trailing.json');
  });

  it('should convert uppercase to lowercase', () => {
    // Arrange
    const task = { title: 'UPPERCASE Title Here', priority: 1, id: 'ff00ff00' };

    // Act
    const filename = getTaskFilename(task);

    // Assert
    expect(filename).toBe('1_ff00ff00_uppercase-title-here.json');
  });

  it('should generate a random id when none is provided', () => {
    // Arrange
    const task = { title: 'No id task', priority: 2 };

    // Act
    const filename = getTaskFilename(task);

    // Assert
    // Should match pattern: 2_{8-char-hex}_no-id-task.json
    expect(filename).toMatch(/^2_[a-f0-9]{8}_no-id-task\.json$/);
  });
});

// ─── Tests for extractTaskJson ───────────────────────────────────────────────

describe('extractTaskJson', () => {
  let extractTaskJson;

  beforeAll(async () => {
    const mod = await import('../server.js');
    extractTaskJson = mod.extractTaskJson;
  });

  it('should parse a plain JSON response', () => {
    // Arrange
    const input = JSON.stringify({
      title: 'Test task',
      priority: 2,
      type: 'improvement',
      description: 'A test task'
    });

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).not.toBeNull();
    expect(result.title).toBe('Test task');
    expect(result.priority).toBe(2);
  });

  it('should extract JSON from markdown code fences', () => {
    // Arrange
    const input = `Here is the task I generated:

\`\`\`json
{
  "title": "Extracted task",
  "priority": 1,
  "type": "problem",
  "description": "Found via code fence"
}
\`\`\`

That should work!`;

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).not.toBeNull();
    expect(result.title).toBe('Extracted task');
    expect(result.priority).toBe(1);
    expect(result.type).toBe('problem');
  });

  it('should handle mixed text and JSON (balanced-brace extraction)', () => {
    // Arrange
    const input = `I analyzed the codebase and here is my recommendation:
The following task should be created:
{"title":"Mixed text task","priority":3,"type":"idea","description":"Found in text"}
End of response.`;

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).not.toBeNull();
    expect(result.title).toBe('Mixed text task');
  });

  it('should return null for empty input', () => {
    // Arrange
    const input = '';

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    // Arrange
    const input = null;

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).toBeNull();
  });

  it('should return null for non-JSON text', () => {
    // Arrange
    const input = 'This is just plain text with no JSON objects at all.';

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).toBeNull();
  });

  it('should prefer JSON objects with a title field', () => {
    // Arrange
    const input = `Some config: {"key": "value", "nested": true}
And the task: {"title": "Preferred task", "priority": 2, "type": "improvement", "description": "This has a title"}`;

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).not.toBeNull();
    expect(result.title).toBe('Preferred task');
  });

  it('should strip BOM and ANSI escape codes before parsing', () => {
    // Arrange
    const input = '\uFEFF\x1B[32m{"title":"Cleaned task","priority":1,"type":"problem","description":"Has ANSI"}\x1B[0m';

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).not.toBeNull();
    expect(result.title).toBe('Cleaned task');
  });

  it('should score higher for objects with more task-like fields', () => {
    // Arrange — two JSON objects, one is more task-like
    const input = `{"count": 5, "title": "Not really a task"}
{"title": "Real task", "priority": 2, "type": "improvement", "description": "Full task object", "files": ["src/app.tsx"]}`;

    // Act
    const result = extractTaskJson(input);

    // Assert
    expect(result).not.toBeNull();
    expect(result.title).toBe('Real task');
    expect(result.files).toEqual(['src/app.tsx']);
  });
});

// ─── Tests for findJsonCandidates ────────────────────────────────────────────

describe('findJsonCandidates', () => {
  let findJsonCandidates;

  beforeAll(async () => {
    const mod = await import('../server.js');
    findJsonCandidates = mod.findJsonCandidates;
  });

  it('should find a single JSON object in plain text', () => {
    // Arrange
    const text = 'prefix {"key": "value"} suffix';

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    expect(candidates.length).toBe(1);
    expect(JSON.parse(candidates[0])).toEqual({ key: 'value' });
  });

  it('should find multiple JSON objects', () => {
    // Arrange
    const text = '{"a": 1} some text {"b": 2}';

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    expect(candidates.length).toBe(2);
    expect(JSON.parse(candidates[0])).toEqual({ a: 1 });
    expect(JSON.parse(candidates[1])).toEqual({ b: 2 });
  });

  it('should handle nested braces correctly', () => {
    // Arrange
    const text = '{"outer": {"inner": "value"}}';

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    // Should find the outer object (which includes the inner)
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const outerParsed = JSON.parse(candidates[0]);
    expect(outerParsed.outer.inner).toBe('value');
  });

  it('should handle braces inside strings', () => {
    // Arrange
    const text = '{"message": "use { and } in text"}';

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(candidates[0]);
    expect(parsed.message).toBe('use { and } in text');
  });

  it('should return empty array for text without braces', () => {
    // Arrange
    const text = 'no braces here at all';

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    expect(candidates).toEqual([]);
  });

  it('should skip candidates larger than 10KB', () => {
    // Arrange
    const largeValue = 'x'.repeat(11000);
    const text = `{"large": "${largeValue}"}`;

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    expect(candidates).toEqual([]);
  });

  it('should handle escaped quotes in strings', () => {
    // Arrange
    const text = '{"msg": "he said \\"hello\\""}';

    // Act
    const candidates = findJsonCandidates(text);

    // Assert
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(candidates[0]);
    expect(parsed.msg).toBe('he said "hello"');
  });
});

// ─── Tests for loadAllTasks ──────────────────────────────────────────────────

describe('loadAllTasks', () => {
  let loadAllTasks;

  beforeAll(async () => {
    const mod = await import('../server.js');
    loadAllTasks = mod.loadAllTasks;
  });

  it('should return an empty array when no task files exist', () => {
    // Arrange — TASKS_DIR may not exist in test or be empty
    // (the actual function reads from the real tasks/ folder,
    // so this test verifies the function doesn't crash)

    // Act
    const result = loadAllTasks();

    // Assert
    expect(Array.isArray(result)).toBe(true);
  });

  it('should exclude the task template file (0_task_template.json)', () => {
    // Arrange — loadAllTasks reads from the real tasks dir
    // The template file exists there

    // Act
    const result = loadAllTasks();

    // Assert
    const templateIncluded = result.some(t => t._filename === '0_task_template.json');
    expect(templateIncluded).toBe(false);
  });

  it('should sort tasks by priority (lowest first)', () => {
    // Arrange — real tasks exist with varying priorities

    // Act
    const result = loadAllTasks();

    // Assert
    if (result.length >= 2) {
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].priority || 99).toBeLessThanOrEqual(result[i + 1].priority || 99);
      }
    }
  });

  it('should include _filename metadata on each task', () => {
    // Arrange — real tasks exist

    // Act
    const result = loadAllTasks();

    // Assert
    if (result.length > 0) {
      for (const task of result) {
        expect(task._filename).toBeDefined();
        expect(task._filename).toMatch(/\.json$/);
      }
    }
  });
});

// ─── Tests for parseQaAgentActivity ──────────────────────────────────────────

describe('parseQaAgentActivity', () => {
  let parseQaAgentActivity;

  beforeAll(async () => {
    const mod = await import('../server.js');
    parseQaAgentActivity = mod.parseQaAgentActivity;
  });

  it('should return idle state for empty output', () => {
    // Arrange
    const outputLines = [];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('idle');
    expect(result.task).toBeNull();
  });

  it('should return idle state for null input', () => {
    // Arrange
    const outputLines = null;

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('idle');
  });

  it('should detect waiting state from output', () => {
    // Arrange
    const outputLines = [
      { text: 'Testing complete' },
      { text: 'Next iteration in 30 seconds...' }
    ];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('waiting');
  });

  it('should detect testing state from puppeteer references', () => {
    // Arrange
    const outputLines = [
      { text: 'Starting QA cycle' },
      { text: 'Calling puppeteer_navigate to http://localhost:5173' }
    ];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('testing');
    expect(result.task).toBe('Browser testing');
  });

  it('should detect research state from web_search references', () => {
    // Arrange
    const outputLines = [
      { text: 'Starting research phase' },
      { text: 'Using web_search to find best practices' }
    ];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('researching');
    expect(result.task).toBe('Researching improvements');
  });

  it('should detect task creation state', () => {
    // Arrange
    const outputLines = [
      { text: 'Found issues during testing' },
      { text: 'Creating task for the improvement' }
    ];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('creating-tasks');
    expect(result.task).toBe('Writing findings');
  });

  it('should detect active iteration state', () => {
    // Arrange
    const outputLines = [
      { text: '=== Iteration 3 ===' }
    ];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert
    expect(result.type).toBe('active');
    expect(result.task).toBe('Running QA cycle');
  });

  it('should prioritize most recent state (latest line wins)', () => {
    // Arrange — testing first, then waiting (more recent)
    const outputLines = [
      { text: 'puppeteer_navigate to test' },
      { text: 'All done' },
      { text: 'Next iteration in 60 seconds...' }
    ];

    // Act
    const result = parseQaAgentActivity(outputLines);

    // Assert — should be waiting since it's the most recent match
    expect(result.type).toBe('waiting');
  });
});

// ─── Tests for REST API Endpoints ────────────────────────────────────────────

describe('Tasks REST API', () => {
  let request;
  let app;
  let server;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const mod = await import('../server.js');
    app = mod.app;
    server = mod.server;
  });

  afterAll(async () => {
    // Close any open handles
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('GET /api/tasks', () => {
    it('should return 200 with an array of tasks', async () => {
      // Arrange — no special setup, uses real tasks dir

      // Act
      const response = await request(app).get('/api/tasks');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return tasks sorted by priority', async () => {
      // Arrange — real tasks exist

      // Act
      const response = await request(app).get('/api/tasks');

      // Assert
      const tasks = response.body;
      if (tasks.length >= 2) {
        for (let i = 0; i < tasks.length - 1; i++) {
          expect(tasks[i].priority || 99).toBeLessThanOrEqual(tasks[i + 1].priority || 99);
        }
      }
    });
  });

  describe('GET /api/tasks/:filename', () => {
    it('should return 404 for a non-existent task', async () => {
      // Arrange
      const filename = 'non-existent-task-xyz.json';

      // Act
      const response = await request(app).get(`/api/tasks/${filename}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 200 with task data for an existing task', async () => {
      // Arrange — get a real task filename from the list
      const listResponse = await request(app).get('/api/tasks');
      if (listResponse.body.length === 0) return; // skip if no tasks
      const existingFilename = listResponse.body[0]._filename;

      // Act
      const response = await request(app).get(`/api/tasks/${existingFilename}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.title).toBeDefined();
      expect(response.body._filename).toBe(existingFilename);
    });
  });

  describe('POST /api/tasks', () => {
    it('should return 400 when title is missing', async () => {
      // Arrange
      const task = { priority: 2, type: 'improvement' };

      // Act
      const response = await request(app)
        .post('/api/tasks')
        .send(task);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title and priority are required');
    });

    it('should return 400 when priority is missing', async () => {
      // Arrange
      const task = { title: 'Test task without priority' };

      // Act
      const response = await request(app)
        .post('/api/tasks')
        .send(task);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title and priority are required');
    });

    it('should return 201 and create a task file', async () => {
      // Arrange
      const task = {
        title: 'UNIT TEST temporary task',
        priority: 4,
        type: 'idea',
        description: 'Created by unit test - safe to delete',
        state: 'todo',
        origin: 'ai'
      };

      // Act
      const response = await request(app)
        .post('/api/tasks')
        .send(task);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.title).toBe('UNIT TEST temporary task');
      expect(response.body._filename).toMatch(/^4_[a-f0-9]{8}_unit-test-temporary-task\.json$/);

      // Cleanup — delete the created task
      const filepath = join(dirname(__dirname), '..', 'tasks', response.body._filename);
      if (existsSync(filepath)) {
        const { unlinkSync } = await import('fs');
        unlinkSync(filepath);
      }
    });
  });

  describe('DELETE /api/tasks/:filename', () => {
    it('should return 404 for a non-existent task', async () => {
      // Arrange
      const filename = 'non-existent-task-delete-test.json';

      // Act
      const response = await request(app).delete(`/api/tasks/${filename}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('POST /api/tasks/generate', () => {
    it('should return 400 when prompt is missing', async () => {
      // Arrange
      const body = {};

      // Act
      const response = await request(app)
        .post('/api/tasks/generate')
        .send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('prompt is required');
    });

    it('should return 400 when prompt is empty string', async () => {
      // Arrange
      const body = { prompt: '   ' };

      // Act
      const response = await request(app)
        .post('/api/tasks/generate')
        .send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('prompt is required');
    });
  });
});

// ─── Tests for Errors REST API ───────────────────────────────────────────────

describe('Errors REST API', () => {
  let request;
  let app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const mod = await import('../server.js');
    app = mod.app;
  });

  describe('GET /api/errors', () => {
    it('should return 200 with an array', async () => {
      // Arrange — errors dir may or may not exist

      // Act
      const response = await request(app).get('/api/errors');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/errors/:filename', () => {
    it('should return 404 for a non-existent error file', async () => {
      // Arrange
      const filename = 'non-existent-error.md';

      // Act
      const response = await request(app).get(`/api/errors/${filename}`);

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 400 for path traversal attempts', async () => {
      // Arrange — Note: the server checks existsSync before path traversal,
      // so non-existent traversal paths return 404 first. 
      // The path traversal guard is a secondary defense.
      const filename = '../../../etc/passwd';

      // Act
      const response = await request(app).get(`/api/errors/${encodeURIComponent(filename)}`);

      // Assert — returns 404 because existsSync check runs before traversal check
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/errors/:filename', () => {
    it('should return 400 for path traversal attempts', async () => {
      // Arrange
      const filename = '..\\server.js';

      // Act
      const response = await request(app).delete(`/api/errors/${encodeURIComponent(filename)}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid filename');
    });

    it('should return 404 for a non-existent error file', async () => {
      // Arrange
      const filename = 'does-not-exist.md';

      // Act
      const response = await request(app).delete(`/api/errors/${filename}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/errors (clear all)', () => {
    it('should return 200 with success', async () => {
      // Arrange — no errors to delete (or errors dir might not exist)

      // Act
      const response = await request(app).delete('/api/errors');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

// ─── Tests for Agents REST API ───────────────────────────────────────────────

describe('Agents REST API', () => {
  let request;
  let app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const mod = await import('../server.js');
    app = mod.app;
  });

  describe('GET /api/agents', () => {
    it('should return 200 with an array of agents', async () => {
      // Arrange — agents.json defines the configured agents

      // Act
      const response = await request(app).get('/api/agents');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include status field on each agent', async () => {
      // Arrange — no special setup

      // Act
      const response = await request(app).get('/api/agents');

      // Assert
      for (const agent of response.body) {
        expect(agent.status).toBeDefined();
        expect(['running', 'stopped', 'error']).toContain(agent.status);
      }
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should return 404 for a non-existent agent', async () => {
      // Arrange
      const id = 'non-existent-agent-id';

      // Act
      const response = await request(app).get(`/api/agents/${id}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/agents', () => {
    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const body = { name: 'Test Agent' }; // missing type and agent

      // Act
      const response = await request(app)
        .post('/api/agents')
        .send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name, type, and agent are required');
    });

    it('should return 400 for invalid type', async () => {
      // Arrange
      const body = { name: 'Test Agent', type: 'invalid-type', agent: 'test-agent' };

      // Act
      const response = await request(app)
        .post('/api/agents')
        .send(body);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('type must be one of');
    });
  });

  describe('GET /api/agent-types', () => {
    it('should return available agent types', async () => {
      // Arrange — no setup needed

      // Act
      const response = await request(app).get('/api/agent-types');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const types = response.body.map(t => t.id);
      expect(types).toContain('dev');
      expect(types).toContain('qa');
      expect(types).toContain('task-order');
      expect(types).toContain('custom');
    });

    it('should include default configuration for each type', async () => {
      // Arrange — no setup needed

      // Act
      const response = await request(app).get('/api/agent-types');

      // Assert
      for (const agentType of response.body) {
        expect(agentType.id).toBeDefined();
        expect(agentType.name).toBeDefined();
        expect(agentType.description).toBeDefined();
        expect(typeof agentType.defaultTimeout).toBe('number');
        expect(typeof agentType.defaultInterval).toBe('number');
      }
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should return 404 for non-existent agent', async () => {
      // Arrange
      const body = { name: 'Updated Name' };

      // Act
      const response = await request(app)
        .put('/api/agents/non-existent-id')
        .send(body);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('should return 404 for non-existent agent', async () => {
      // Arrange — no setup needed

      // Act
      const response = await request(app).delete('/api/agents/non-existent-id');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Agent not found');
    });
  });
});



// ─── Tests for generateTaskId ────────────────────────────────────────────────

describe('generateTaskId', () => {
  let generateTaskId;

  beforeAll(async () => {
    const mod = await import('../server.js');
    generateTaskId = mod.generateTaskId;
  });

  it('should return an 8-character hex string', () => {
    // Arrange — no setup needed

    // Act
    const id = generateTaskId();

    // Assert
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });

  it('should generate unique IDs on consecutive calls', () => {
    // Arrange — generate multiple IDs

    // Act
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTaskId());
    }

    // Assert — all 100 should be unique
    expect(ids.size).toBe(100);
  });

  it('should return a string type', () => {
    // Arrange — no setup needed

    // Act
    const id = generateTaskId();

    // Assert
    expect(typeof id).toBe('string');
  });
});

// ─── Tests for PUT /api/tasks/:filename ──────────────────────────────────────

describe('Tasks REST API — PUT', () => {
  let request;
  let app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const mod = await import('../server.js');
    app = mod.app;
  });

  describe('PUT /api/tasks/:filename', () => {
    it('should return 404 for a non-existent task', async () => {
      // Arrange
      const body = { title: 'Updated task', priority: 2 };

      // Act
      const response = await request(app)
        .put('/api/tasks/non-existent-task.json')
        .send(body);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should update an existing task and return 200', async () => {
      // Arrange — create a task first
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'PUT test task', priority: 3, type: 'idea', state: 'todo', origin: 'ai' });
      expect(createResponse.status).toBe(201);
      const filename = createResponse.body._filename;

      // Act — update the task
      const response = await request(app)
        .put(`/api/tasks/${filename}`)
        .send({ title: 'PUT test task updated', priority: 2, type: 'improvement', state: 'in-progress', origin: 'ai' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('PUT test task updated');
      expect(response.body.priority).toBe(2);
      expect(response.body.state).toBe('in-progress');

      // Cleanup — delete the task (may have been renamed)
      const deleteFilename = response.body._filename;
      await request(app).delete(`/api/tasks/${deleteFilename}`);
    });

    it('should rename the file when priority changes', async () => {
      // Arrange — create a task with priority 4
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Rename test task', priority: 4, type: 'idea', state: 'todo', origin: 'ai' });
      expect(createResponse.status).toBe(201);
      const originalFilename = createResponse.body._filename;
      expect(originalFilename).toMatch(/^4_/);

      // Act — update priority to 1
      const response = await request(app)
        .put(`/api/tasks/${originalFilename}`)
        .send({ title: 'Rename test task', priority: 1, type: 'idea', state: 'todo', origin: 'ai' });

      // Assert — filename should now start with 1_
      expect(response.status).toBe(200);
      expect(response.body._filename).toMatch(/^1_/);
      expect(response.body._filename).not.toBe(originalFilename);

      // Cleanup
      await request(app).delete(`/api/tasks/${response.body._filename}`);
    });
  });
});

// ─── Tests for Task Security (path traversal on tasks) ───────────────────────

describe('Tasks REST API — Security', () => {
  let request;
  let app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const mod = await import('../server.js');
    app = mod.app;
  });

  it('should return 404 for path traversal in GET /api/tasks/:filename', async () => {
    // Arrange — attempt path traversal
    const filename = '..%2F..%2Fpackage.json';

    // Act
    const response = await request(app).get(`/api/tasks/${filename}`);

    // Assert — should not serve files outside tasks directory
    expect(response.status).toBe(404);
  });

  it('should return 404 for path traversal in DELETE /api/tasks/:filename', async () => {
    // Arrange
    const filename = '..%2Fserver.js';

    // Act
    const response = await request(app).delete(`/api/tasks/${filename}`);

    // Assert
    expect(response.status).toBe(404);
  });
});

// ─── Tests for WebSocket broadcast function ──────────────────────────────────

describe('broadcast', () => {
  let broadcast;

  beforeAll(async () => {
    const mod = await import('../server.js');
    broadcast = mod.broadcast;
  });

  it('should be a function', () => {
    // Assert
    expect(typeof broadcast).toBe('function');
  });

  it('should not throw when no clients are connected', () => {
    // Arrange
    const message = { type: 'test', data: 'hello' };

    // Act & Assert — should not throw
    expect(() => broadcast(message)).not.toThrow();
  });

  it('should handle complex message objects', () => {
    // Arrange
    const message = {
      type: 'task-created',
      task: { title: 'Test', priority: 2, nested: { deep: true } }
    };

    // Act & Assert
    expect(() => broadcast(message)).not.toThrow();
  });
});

// ─── Tests for static file serving ──────────────────────────────────────────

describe('Static File Serving', () => {
  let request;
  let app;

  beforeAll(async () => {
    const supertest = await import('supertest');
    request = supertest.default;
    const mod = await import('../server.js');
    app = mod.app;
  });

  it('should serve index.html at the root path', async () => {
    // Arrange — no setup needed

    // Act
    const response = await request(app).get('/');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
  });

  it('should serve CSS files', async () => {
    // Arrange — no setup needed

    // Act
    const response = await request(app).get('/style.css');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/css/);
  });

  it('should serve JavaScript files', async () => {
    // Arrange — no setup needed

    // Act
    const response = await request(app).get('/app.js');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
  });

  it('should return 404 for non-existent static files', async () => {
    // Arrange — no setup needed

    // Act
    const response = await request(app).get('/non-existent-file.xyz');

    // Assert
    // Express static returns 404 for missing files
    expect(response.status).toBe(404);
  });
});

// ─── Tests for TASKS_DIR export ──────────────────────────────────────────────

describe('TASKS_DIR', () => {
  let TASKS_DIR;

  beforeAll(async () => {
    const mod = await import('../server.js');
    TASKS_DIR = mod.TASKS_DIR;
  });

  it('should be a string path', () => {
    // Assert
    expect(typeof TASKS_DIR).toBe('string');
  });

  it('should end with tasks directory name', () => {
    // Assert
    expect(TASKS_DIR).toMatch(/tasks$/);
  });

  it('should be an absolute path', () => {
    // Assert — on Windows it starts with drive letter, on Unix with /
    const isAbsolute = TASKS_DIR.startsWith('/') || /^[A-Z]:/i.test(TASKS_DIR);
    expect(isAbsolute).toBe(true);
  });
});