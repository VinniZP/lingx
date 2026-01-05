import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Load environment variables from .env
dotenv.config();

// Set NODE_ENV to test for test database and rate limit relaxation
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/__tests__/*.test.ts'],
    // Integration tests are included but use separate test database
    exclude: ['node_modules/**'],
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
