/**
 * API Key Authentication Middleware — Azure Functions v4
 *
 * Validates the `x-api-key` header against the API_KEY environment variable.
 * Returns 401 Unauthorized with a JSON error body if the key is missing or invalid.
 *
 * Usage: Register via `app.hook('preInvocation', validateApiKey)` in the
 * entry point, or call `validateApiKey` from individual function handlers.
 */

import { HttpRequest, HttpResponseInit } from '@azure/functions';

/** JSON error response body for authentication failures */
interface AuthErrorResponse {
  error: string;
  message: string;
}

/**
 * Validates the x-api-key header against the API_KEY environment variable.
 *
 * @param request - The incoming HTTP request
 * @returns `null` if authentication succeeds, or an HttpResponseInit with 401 status if it fails
 */
export function validateApiKey(request: HttpRequest): HttpResponseInit | null {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    // API_KEY not configured — deny all requests (fail closed)
    const body: AuthErrorResponse = {
      error: 'Unauthorized',
      message: 'API key is not configured on the server.',
    };
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: body,
    };
  }

  const providedKey = request.headers.get('x-api-key');

  if (!providedKey) {
    const body: AuthErrorResponse = {
      error: 'Unauthorized',
      message: 'Missing x-api-key header.',
    };
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: body,
    };
  }

  if (providedKey !== apiKey) {
    const body: AuthErrorResponse = {
      error: 'Unauthorized',
      message: 'Invalid API key.',
    };
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: body,
    };
  }

  // Authentication passed
  return null;
}

/**
 * Convenience wrapper that calls validateApiKey and returns early if auth fails.
 * Use in function handlers:
 *
 * ```ts
 * export async function getTask(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
 *   const authResponse = requireAuth(request);
 *   if (authResponse) return authResponse;
 *   // ... handler logic
 * }
 * ```
 */
export function requireAuth(request: HttpRequest): HttpResponseInit | null {
  return validateApiKey(request);
}
