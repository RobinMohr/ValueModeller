import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,mjs}'],
    coverage: {
      provider: 'v8',
      include: ['server.js'],
      reporter: ['text', 'text-summary'],
    },
  },
});
