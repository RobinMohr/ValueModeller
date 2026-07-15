/**
 * GET /api/tasks — Returns all tasks with optional filters and summary statistics.
 *
 * Query parameters (all optional):
 *   - state: Filter by task state (todo, in-progress, developed)
 *   - priority: Filter by priority (1-4)
 *   - type: Filter by type (improvement, problem, idea)
 *   - origin: Filter by origin (user, ai, user-assisted)
 *
 * Response body:
 *   { tasks: Task[], summary: { by_state, by_priority, by_origin, total } }
 *
 * Supports ETag/If-None-Match for conditional requests (304 Not Modified).
 * ETag is based on MAX(updated_at) from the tasks table.
 *
 * Requires x-api-key authentication.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query, queryOne } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { Task } from '../validation/task-schema.js';

/** Database row shape for task listing. */
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
  [key: string]: unknown;
};

/** Row shape for the MAX(updated_at) query. */
type ETagRow = {
  max_updated_at: string | null;
  [key: string]: unknown;
};

/** Summary counts grouped by a dimension. */
interface SummarySection {
  [key: string]: number;
}

/** Full summary object returned alongside tasks. */
interface TaskSummary {
  by_state: SummarySection;
  by_priority: SummarySection;
  by_origin: SummarySection;
  total: number;
}

/** Valid filter keys that map to table columns. */
const VALID_FILTERS = ['state', 'priority', 'type', 'origin'] as const;

export async function getTasks(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const authResponse = requireAuth(request);
  if (authResponse) return authResponse;

  context.log('GET /api/tasks — listing tasks');

  try {
    // --- ETag / conditional request handling ---
    const etagRow = await queryOne<ETagRow>(
      'SELECT MAX(updated_at) AS max_updated_at FROM tasks'
    );

    const maxUpdatedAt = etagRow?.max_updated_at ?? '';
    const etag = `"${Buffer.from(maxUpdatedAt).toString('base64')}"`;

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return { status: 304 };
    }

    // --- Build query with optional filters ---
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    for (const key of VALID_FILTERS) {
      const value = request.query.get(key);
      if (value !== null && value !== '') {
        conditions.push(`${key} = @${key}`);
        params[key] = key === 'priority' ? parseInt(value, 10) : value;
      }
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const sql = `
      SELECT
        id,
        title,
        priority,
        type,
        state,
        description,
        files,
        origin,
        created_at,
        updated_at
      FROM tasks
      ${whereClause}
      ORDER BY priority ASC, created_at ASC
    `;

    const result = await query<TaskRow>(sql, params);

    // --- Map rows to Task objects ---
    const tasks: Task[] = result.recordset.map((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority as 1 | 2 | 3 | 4,
      type: row.type as Task['type'],
      state: row.state as Task['state'],
      description: row.description,
      files: JSON.parse(row.files || '[]') as string[],
      origin: row.origin as Task['origin'],
    }));

    // --- Build summary object ---
    const summary: TaskSummary = {
      by_state: {},
      by_priority: {},
      by_origin: {},
      total: tasks.length,
    };

    for (const task of tasks) {
      summary.by_state[task.state] = (summary.by_state[task.state] ?? 0) + 1;
      summary.by_priority[String(task.priority)] = (summary.by_priority[String(task.priority)] ?? 0) + 1;
      summary.by_origin[task.origin] = (summary.by_origin[task.origin] ?? 0) + 1;
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Cache-Control': 'no-cache',
      },
      jsonBody: { tasks, summary },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Failed to list tasks:', message);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Internal Server Error', message: 'Failed to retrieve tasks.' },
    };
  }
}

app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: getTasks,
});
