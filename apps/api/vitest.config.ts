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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
