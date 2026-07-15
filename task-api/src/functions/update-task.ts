import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool, sql } from '../db/client.js';
import { validateApiKey } from '../middleware/auth.js';
import { updateTaskSchema } from '../validation/task-schema.js';
import { Task } from '../types/task.js';

async function updateTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const id = request.params.id;
  if (!id || isNaN(Number(id))) {
    return {
      status: 400,
      jsonBody: { error: 'Invalid task ID: must be a number' },
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON body' },
    };
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
    };
  }

  const input = parsed.data;

  try {
    const pool = await getPool();

    // Build dynamic SET clause
    const setClauses: string[] = ['updated_at = GETUTCDATE()'];
    const queryRequest = pool.request().input('id', sql.Int, parseInt(id, 10));

    if (input.title !== undefined) {
      setClauses.push('title = @title');
      queryRequest.input('title', sql.NVarChar(200), input.title);
    }
    if (input.priority !== undefined) {
      setClauses.push('priority = @priority');
      queryRequest.input('priority', sql.TinyInt, input.priority);
    }
    if (input.type !== undefined) {
      setClauses.push('type = @type');
      queryRequest.input('type', sql.VarChar(20), input.type);
    }
    if (input.state !== undefined) {
      setClauses.push('state = @state');
      queryRequest.input('state', sql.VarChar(20), input.state);
    }
    if (input.description !== undefined) {
      setClauses.push('description = @description');
      queryRequest.input('description', sql.NVarChar(sql.MAX), input.description);
    }
    if (input.files !== undefined) {
      setClauses.push('files = @files');
      queryRequest.input('files', sql.NVarChar(sql.MAX), JSON.stringify(input.files));
    }
    if (input.origin !== undefined) {
      setClauses.push('origin = @origin');
      queryRequest.input('origin', sql.VarChar(20), input.origin);
    }

    const result = await queryRequest.query(`
      UPDATE tasks
      SET ${setClauses.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

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
    context.error('Error updating task:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: updateTask,
});
