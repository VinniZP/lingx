import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Set NODE_ENV to test for rate limit relaxation
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Run test files sequentially to avoid database race conditions
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
