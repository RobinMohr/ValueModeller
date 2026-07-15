import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool, sql } from '../db/client.js';
import { validateApiKey } from '../middleware/auth.js';

async function deleteTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
      .query('DELETE FROM tasks WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return {
        status: 404,
        jsonBody: { error: `Task with id ${id} not found` },
      };
    }

    return { status: 204 };
  } catch (error) {
    context.error('Error deleting task:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: deleteTask,
});
