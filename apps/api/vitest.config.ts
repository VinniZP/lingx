import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Set NODE_ENV to test for test database and rate limit relaxation
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Run test files sequentially to avoid database race conditions
    fileParallelism: false,
    // Global setup/teardown for test database
    globalSetup: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
