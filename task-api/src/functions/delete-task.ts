/**
 * DELETE /api/tasks/{id} — Deletes a task by its 8-char hex ID.
 *
 * Returns 400 if the ID format is invalid.
 * Returns 404 if the task does not exist.
 * Returns 204 No Content on successful deletion.
 * Requires x-api-key authentication.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { execute } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

/** Validates that a string is an 8-char lowercase hex ID. */
function isValidTaskId(id: string): boolean {
  return /^[0-9a-f]{8}$/.test(id);
}

export async function deleteTask(
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

  context.log(`DELETE /api/tasks/${id} — deleting task`);

  try {
    const rowsAffected = await execute(
      `DELETE FROM tasks WHERE id = @id`,
      { id },
    );

    if (rowsAffected === 0) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { error: 'Not Found', message: `Task with ID '${id}' not found.` },
      };
    }

    return { status: 204 };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    context.error('Failed to delete task:', message);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { error: 'Internal Server Error', message: 'Failed to delete task.' },
    };
  }
}

app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: deleteTask,
});
