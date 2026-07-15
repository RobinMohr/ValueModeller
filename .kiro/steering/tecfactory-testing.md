---
inclusion: fileMatch
fileMatchPattern: "tecfactory/tests/**"
---

# TecFactory Unit Testing — Skill & Template

## Testing Framework

- **Runner:** Vitest (ESM-native, fast, compatible with the project's module system)
- **HTTP Testing:** Supertest (testing Express endpoints without starting the server)
- **Coverage:** @vitest/coverage-v8

## Commands

```bash
cd tecfactory
npm test              # Run all tests once
npm run test:watch    # Watch mode (re-runs on file changes)
npm run test:coverage # Run with coverage report
```

## AAA Principle (Arrange-Act-Assert)

Every test MUST follow the AAA structure with clear comments:

```javascript
it('should <expected behavior> when <condition>', async () => {
  // Arrange — set up preconditions and inputs
  const input = { title: 'Example', priority: 2 };

  // Act — execute the code under test
  const result = await request(app).post('/api/tasks').send(input);

  // Assert — verify the expected outcome
  expect(result.status).toBe(201);
  expect(result.body.title).toBe('Example');
});
```

## Test File Template

```javascript
/**
 * TecFactory — <Module Name> Tests
 *
 * Tests for: <brief description of what is being tested>
 * AAA Principle: Arrange → Act → Assert
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

describe('<Module or Feature>', () => {
  let dependencies; // app, request, etc.

  beforeAll(async () => {
    // One-time setup: import modules, start connections
    const supertest = await import('supertest');
    const mod = await import('../server.js');
    dependencies = { request: supertest.default, app: mod.app };
  });

  afterAll(async () => {
    // Cleanup: close connections, remove temp files
  });

  describe('<Specific endpoint or function>', () => {
    it('should <expected behavior> when <condition>', async () => {
      // Arrange
      const testData = {};

      // Act
      const response = await dependencies.request(dependencies.app)
        .get('/api/endpoint');

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
```

## Naming Conventions

- **Test files:** `<module>.test.mjs` (ESM extension required)
- **Describe blocks:** Feature or module name (e.g., `'Tasks REST API'`)
- **Nested describes:** Specific endpoint or function (e.g., `'GET /api/tasks'`)
- **Test names:** `should <expected behavior> when <condition>`

## What to Test

### Pure Functions (Priority 1)
- `getTaskFilename()` — filename generation from task data
- `extractTaskJson()` — JSON extraction from mixed AI output
- `findJsonCandidates()` — balanced-brace JSON scanning
- `parseQaAgentActivity()` — QA output parsing

### REST Endpoints (Priority 2)
- **Happy path:** Valid request → expected response
- **Validation:** Missing/invalid fields → 400 errors
- **Not found:** Non-existent resources → 404 errors
- **Security:** Path traversal → 400 errors

### Integration Behavior (Priority 3)
- WebSocket message handling
- Agent lifecycle (start/stop)
- File watcher events

## Best Practices

1. **Isolate tests** — each test should be independent, not depend on run order
2. **Clean up side effects** — delete temp files, reset state after tests that create data
3. **Use real data where safe** — read from the actual tasks/ dir for read-only tests
4. **Mock sparingly** — only mock external processes (kiro-cli, git); don't mock the filesystem unless necessary
5. **Test edge cases** — empty strings, null values, special characters, path traversal
6. **Keep assertions focused** — one logical assertion per test (multiple `expect` calls are fine if they verify one concept)
7. **Avoid testing implementation details** — test behavior and output, not internal state

## Coverage Goals

- **Utility functions:** 90%+ line coverage
- **REST endpoints:** All routes have at least happy-path + error-case tests
- **Overall target:** 70%+ for hackathon (pragmatic, not perfection)
