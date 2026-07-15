/**
 * GET /api/tasks/next — Returns the single most important task with state='todo'.
 *
 * Sort order:
 *   1. priority ASC (1=critical first)
 *   2. origin weight ASC (user=1, user-assisted=2, ai=3)
 *   3. created_at ASC (oldest first as tiebreaker)
 *
 * Returns 204 No Content if no todo tasks exist.
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

export async function getNextTask(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResponse = requireAuth(request);
  if (authResponse) return authResponse;

  context.log('GET /api/tasks/next — fetching highest-priority todo task');

  try {
    const row = await queryOne<TaskRow>(
      `SELECT TOP 1
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
      WHERE state = 'todo'
      ORDER BY
        priority ASC,
        CASE origin
          WHEN 'user' THEN 1
          WHEN 'user-assisted' THEN 2
          WHEN 'ai' THEN 3
          ELSE 4
        END ASC,
        created_at ASC`,
    );

    if (!row) {
      return { status: 204 };
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
    context.error('Failed to fetch next task:', message);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Internal Server Error', message: 'Failed to retrieve next task.' },
    };
  }
}

app.http('getNextTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/next',
  handler: getNextTask,
});
