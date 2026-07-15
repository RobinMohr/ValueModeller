/**
 * GET /api/tasks/{id} — Returns a single task by its 8-char hex ID.
 *
 * Returns 400 if the ID format is invalid.
 * Returns 404 with JSON error body if the task is not found.
 * Requires x-api-key authentication.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { queryOne } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { Task } from '../validation/task-schema.js';

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
};

/** Validates that a string is an 8-char lowercase hex ID. */
function isValidTaskId(id: string): boolean {
  return /^[0-9a-f]{8}$/.test(id);
}

export async function getTask(
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

  context.log(`GET /api/tasks/${id} — fetching task by ID`);

  try {
    const row = await queryOne<TaskRow>(
      `SELECT
        id,
        title,
        priority,
        type,
        state,
        description,
        files,
        origin,
        created_at
      FROM tasks
      WHERE id = @id`,
      { id },
    );

    if (!row) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'Not Found', message: `Task with ID '${id}' not found.` },
      };
    }

    const task: Task = {
      id: row.id,
      title: row.title,
      priority: row.priority as 1 | 2 | 3 | 4,
      type: row.type as Task['type'],
      state: row.state as Task['state'],
      description: row.description,
      files: JSON.parse(row.files || '[]') as string[],
      origin: row.origin as Task['origin'],
    };

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: task,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Failed to fetch task:', message);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Internal Server Error', message: 'Failed to retrieve task.' },
    };
  }
}

app.http('getTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: getTask,
});
