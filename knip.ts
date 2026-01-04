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
      entry: ['src/app.ts', 'src/workers/**/*.ts', 'tests/**/*.ts'],
      project: ['src/**/*.ts', 'prisma/**/*.ts', 'tests/**/*.ts'],
      ignoreDependencies: [
        'pino-pretty', // CLI-only, not imported
        '@vitest/coverage-v8', // Used by vitest config
      ],
    },

    'apps/web': {
      entry: ['src/app/**/*.{ts,tsx}'],
      project: ['src/**/*.{ts,tsx}'],
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
      project: ['src/**/*.ts'],
    },

    'packages/cli': {
      entry: ['src/mcp/**/*.ts'],
      project: ['src/**/*.ts'],
      ignoreDependencies: [
        '@vitest/coverage-v8',
        '@types/babel__core', // Type definitions
        '@types/inquirer', // Type definitions
      ],
    },

    'packages/sdk-nextjs': {
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: ['@vitest/coverage-v8'],
    },

    'packages/config': {
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
    '**/lingx.d.ts', // Generated types
    '**/lingx.config.ts', // Lingx CLI config
    '**/components/ui/**', // shadcn components - may be used later
  ],

  ignoreExportsUsedInFile: true,
};

export default config;
