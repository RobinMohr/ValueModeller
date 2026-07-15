import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPool, sql } from '../db/client.js';
import { validateApiKey } from '../middleware/auth.js';
import { Task, TaskListResponse, TaskSummary } from '../types/task.js';
import crypto from 'crypto';

function parseTask(row: any): Task {
  return {
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
}

async function getTasks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const authError = validateApiKey(request);
  if (authError) return authError;

  try {
    const pool = await getPool();

    // Build WHERE clause from query params
    const conditions: string[] = [];
    const params: { name: string; type: any; value: any }[] = [];

    const state = request.query.get('state');
    if (state) {
      conditions.push('state = @state');
      params.push({ name: 'state', type: sql.VarChar(20), value: state });
    }

    const priority = request.query.get('priority');
    if (priority) {
      conditions.push('priority = @priority');
      params.push({ name: 'priority', type: sql.TinyInt, value: parseInt(priority, 10) });
    }

    const type = request.query.get('type');
    if (type) {
      conditions.push('type = @type');
      params.push({ name: 'type', type: sql.VarChar(20), value: type });
    }

    const origin = request.query.get('origin');
    if (origin) {
      conditions.push('origin = @origin');
      params.push({ name: 'origin', type: sql.VarChar(20), value: origin });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryRequest = pool.request();
    for (const param of params) {
      queryRequest.input(param.name, param.type, param.value);
    }

    const result = await queryRequest.query(
      `SELECT * FROM tasks ${whereClause} ORDER BY priority ASC, created_at DESC`
    );

    const tasks: Task[] = result.recordset.map(parseTask);

    // Build summary
    const summary: TaskSummary = {
      total: tasks.length,
      by_state: { 'todo': 0, 'in-progress': 0, 'developed': 0 },
      by_priority: { '1': 0, '2': 0, '3': 0, '4': 0 },
      by_origin: { 'user': 0, 'ai': 0, 'user-assisted': 0 },
    };

    for (const task of tasks) {
      summary.by_state[task.state]++;
      summary.by_priority[String(task.priority)]++;
      summary.by_origin[task.origin]++;
    }

    const response: TaskListResponse = { tasks, summary };

    // Generate ETag from max updated_at
    const maxUpdated = tasks.length > 0
      ? Math.max(...tasks.map(t => new Date(t.updated_at).getTime()))
      : 0;
    const etag = crypto.createHash('md5').update(`${tasks.length}-${maxUpdated}`).digest('hex');

    // Check If-None-Match
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return { status: 304 };
    }

    return {
      status: 200,
      headers: { 'ETag': etag, 'Content-Type': 'application/json' },
      jsonBody: response,
    };
  } catch (error) {
    context.error('Error fetching tasks:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    };
  }
}

app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: getTasks,
});
