import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool, sql } from '../db/client.js';
import { validateApiKey } from '../middleware/auth.js';
import { Task } from '../types/task.js';

async function getTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const id = request.params.id;
  if (!id || isNaN(Number(id))) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid task ID: must be a number' },
    };
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query('SELECT * FROM tasks WHERE id = @id');

    if (result.recordset.length === 0) {
      return {
        status: 404,
        jsonBody: { error: `Task with id ${id} not found` },
      };
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
    context.error('Error fetching task:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('getTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: getTask,
});
