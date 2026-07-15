import { HttpRequest, HttpResponseInit } from '@azure/functions';

export function validateApiKey(request: HttpRequest): HttpResponseInit | null {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      jsonBody: { error: 'Server misconfiguration: API_KEY not set' },
    };
  }

  const providedKey = request.headers.get('x-api-key');
  if (!providedKey || providedKey !== apiKey) {
    return {
      status: 401,
      jsonBody: { error: 'Unauthorized: invalid or missing x-api-key header' },
    };
  }

  return null; // Auth passed
}
