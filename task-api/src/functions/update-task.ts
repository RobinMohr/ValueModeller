/**
 * PUT /api/tasks/{id} — Updates an existing task by ID.
 *
 * Validates input with Zod updateTaskSchema (all fields optional except id).
 * Auto-sets updated_at to current UTC time.
 * Returns 400 if the ID format is invalid or validation fails.
 * Returns 404 if task not found.
 * Returns 200 with updated task object on success.
 *
 * Requires x-api-key authentication.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { execute, queryOne } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { updateTaskSchema, Task } from '../validation/task-schema.js';

/** Database row shape returned by the SQL query. */
type TaskRow = {
  id: string;
  title: string;
  priority: number;
  type: string;
  state: string;
  description: string;
  files: string;
  origin: string;
  created_at: string;
  updated_at: string;
};

/** Validates that a string is an 8-char lowercase hex ID. */
function isValidTaskId(id: string): boolean {
  return /^[0-9a-f]{8}$/.test(id);
}

export async function updateTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResponse = requireAuth(request);
  if (authResponse) return authResponse;

  const id = request.params.id;

  if (!id || !isValidTaskId(id)) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Bad Request', message: 'Task ID must be an 8-character hexadecimal string.' },
    };
  }

  context.log(`PUT /api/tasks/${id} — updating task`);

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

  // Inject the route param ID into the body for validation
  const validationInput = { ...(body as Record<string, unknown>), id };

  // Validate input against updateTaskSchema
  const parseResult = updateTaskSchema.safeParse(validationInput);
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

  try {
    // Check if task exists
    const existing = await queryOne<TaskRow>(
      `SELECT id, title, priority, type, state, description, files, origin, created_at, updated_at
       FROM tasks
       WHERE id = @id`,
      { id },
    );

    if (!existing) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'Not Found', message: `Task with ID '${id}' not found.` },
      };
    }

    // Auto-set updated_at to current UTC time
    const now = new Date().toISOString();

    // Build SET clauses for only the provided fields
    const setClauses: string[] = ['updated_at = @updated_at'];
    const params: Record<string, unknown> = { id, updated_at: now };

    if (input.title !== undefined) {
      setClauses.push('title = @title');
      params.title = input.title;
    }
    if (input.priority !== undefined) {
      setClauses.push('priority = @priority');
      params.priority = input.priority;
    }
    if (input.type !== undefined) {
      setClauses.push('type = @type');
      params.type = input.type;
    }
    if (input.state !== undefined) {
      setClauses.push('state = @state');
      params.state = input.state;
    }
    if (input.description !== undefined) {
      setClauses.push('description = @description');
      params.description = input.description;
    }
    if (input.files !== undefined) {
      setClauses.push('files = @files');
      params.files = JSON.stringify(input.files);
    }
    if (input.origin !== undefined) {
      setClauses.push('origin = @origin');
      params.origin = input.origin;
    }

    await execute(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = @id`,
      params,
    );

    // Build the response by merging existing data with updates
    const updatedTask: Task & { created_at: string; updated_at: string } = {
      id,
      title: input.title ?? existing.title,
      priority: (input.priority ?? existing.priority) as 1 | 2 | 3 | 4,
      type: (input.type ?? existing.type) as Task['type'],
      state: (input.state ?? existing.state) as Task['state'],
      description: input.description ?? existing.description,
      files: input.files ?? (JSON.parse(existing.files || '[]') as string[]),
      origin: (input.origin ?? existing.origin) as Task['origin'],
      created_at: existing.created_at,
      updated_at: now,
    };

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: updatedTask,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Failed to update task:', message);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Internal Server Error', message: 'Failed to update task.' },
    };
  }
}

app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: updateTask,
});
