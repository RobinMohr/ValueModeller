import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool } from '../db/client.js';
import { validateApiKey } from '../middleware/auth.js';
import { Task } from '../types/task.js';

async function getNextTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT TOP 1 *
      FROM tasks
      WHERE state = 'todo'
      ORDER BY
        priority ASC,
        CASE origin
          WHEN 'user' THEN 1
          WHEN 'user-assisted' THEN 2
          WHEN 'ai' THEN 3
        END ASC,
        created_at ASC
    `);

    if (result.recordset.length === 0) {
      return { status: 204 };
    }

    const row = result.recordset[0];
    const task: Task = {
      id: row.id,
      title: row.title,
      priority: row.priority,
      type: row.type,
      state: row.state,
      description: row.description,
      files: JSON.parse(row.files || '[]'),
      origin: row.origin,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };

    return {
      status: 200,
      jsonBody: task,
    };
  } catch (error) {
    context.error('Error fetching next task:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('getNextTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/next',
  handler: getNextTask,
});
