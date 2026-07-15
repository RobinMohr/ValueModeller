/**
 * POST /api/tasks — Creates a new task.
 *
 * Auto-generates an 8-char hex ID via crypto.randomBytes(4).
 * Validates input with Zod createTaskSchema.
 * Sets created_at and updated_at to current UTC time.
 * Returns 201 with the created task object.
 *
 * Requires x-api-key authentication.
 */

import { randomBytes } from 'crypto';
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { execute } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { createTaskSchema, Task } from '../validation/task-schema.js';

export async function createTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResponse = requireAuth(request);
  if (authResponse) return authResponse;

  context.log('POST /api/tasks — creating new task');

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Bad Request', message: 'Request body must be valid JSON.' },
    };
  }

  // Validate input against createTaskSchema
  const parseResult = createTaskSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Validation Error', message: 'Invalid task data.', issues },
    };
  }

  const input = parseResult.data;

  // Generate 8-char hex ID
  const id = randomBytes(4).toString('hex');

  // Current UTC timestamp
  const now = new Date().toISOString();

  try {
    await execute(
      `INSERT INTO tasks (id, title, priority, type, state, description, files, origin, created_at, updated_at)
       VALUES (@id, @title, @priority, @type, @state, @description, @files, @origin, @created_at, @updated_at)`,
      {
        id,
        title: input.title,
        priority: input.priority,
        type: input.type,
        state: input.state,
        description: input.description,
        files: JSON.stringify(input.files),
        origin: input.origin,
        created_at: now,
        updated_at: now,
      }
    );

    const task: Task & { created_at: string; updated_at: string } = {
      id,
      title: input.title,
      priority: input.priority,
      type: input.type,
      state: input.state,
      description: input.description,
      files: input.files,
      origin: input.origin,
      created_at: now,
      updated_at: now,
    };

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: task,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Failed to create task:', message);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Internal Server Error', message: 'Failed to create task.' },
    };
  }
}

app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: createTask,
});
