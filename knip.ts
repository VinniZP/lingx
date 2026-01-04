import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      // Root workspace - shared config and tooling
      ignoreDependencies: [
        // ESLint config dependencies (used via @lingx/config/eslint)
        '@eslint/js',
        'eslint-plugin-import',
        'globals',
        'typescript-eslint',
        // Vitest runs via turbo, not direct import
        'vitest',
      ],
    },

    'apps/api': {
      entry: ['src/index.ts', 'src/app.ts', 'prisma/seed.ts', 'src/workers/**/*.ts'],
      project: ['src/**/*.ts', 'prisma/**/*.ts'],
      ignoreDependencies: [
        'pino-pretty', // CLI-only, not imported
        '@vitest/coverage-v8', // Used by vitest config
      ],
    },

    'apps/web': {
      entry: ['src/app/**/*.{ts,tsx}', 'playwright.config.ts', 'vitest.config.ts'],
      project: ['src/**/*.{ts,tsx}'],
      ignore: ['src/lingx.d.ts'], // Generated types
      ignoreDependencies: [
        // PostCSS/Tailwind - used via config, not imported
        'tailwindcss',
        'tw-animate-css',
        'postcss',
        // CLI used via scripts
        '@lingx/cli',
        // Vitest coverage
        '@vitest/coverage-v8',
        // Radix UI - used by shadcn components
        '@radix-ui/react-progress',
        '@radix-ui/react-tabs',
        // Command palette
        'cmdk',
      ],
    },

    'packages/shared': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
    },

    'packages/cli': {
      entry: ['src/index.ts', 'src/mcp/**/*.ts'],
      project: ['src/**/*.ts'],
      ignore: ['src/lingx.d.ts'], // Generated types
      ignoreDependencies: [
        '@vitest/coverage-v8',
        '@types/babel__core', // Type definitions
        '@types/inquirer', // Type definitions
      ],
    },

    'packages/sdk-nextjs': {
      entry: ['src/index.ts', 'src/server/index.ts'],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: ['@vitest/coverage-v8'],
    },

    'packages/config': {
      entry: ['eslint/index.js', 'tsconfig/*.json'],
      project: ['**/*.{js,json}'],
    },

    'packages/sdk-angular': {
      ignore: ['**/*'], // Empty placeholder
    },
  },

  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    'src/lingx.d.ts', // Root generated types (if exists)
  ],

  ignoreExportsUsedInFile: true,
};

export default config;
