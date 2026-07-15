import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool, sql } from '../db/client.js';
import { validateApiKey } from '../middleware/auth.js';
import { createTaskSchema } from '../validation/task-schema.js';
import { Task } from '../types/task.js';

async function createTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const authError = validateApiKey(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON body' },
    };
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      jsonBody: { error: 'Validation failed', details: parsed.error.flatten() },
    };
  }

  const input = parsed.data;

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('title', sql.NVarChar(200), input.title)
      .input('priority', sql.TinyInt, input.priority)
      .input('type', sql.VarChar(20), input.type)
      .input('state', sql.VarChar(20), input.state)
      .input('description', sql.NVarChar(sql.MAX), input.description)
      .input('files', sql.NVarChar(sql.MAX), JSON.stringify(input.files))
      .input('origin', sql.VarChar(20), input.origin)
      .query(`
        INSERT INTO tasks (title, priority, type, state, description, files, origin)
        OUTPUT INSERTED.*
        VALUES (@title, @priority, @type, @state, @description, @files, @origin)
      `);

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
      status: 201,
      jsonBody: task,
    };
  } catch (error) {
    context.error('Error creating task:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: createTask,
});
