import type { LingxConfig } from '@lingx/cli';

const config: LingxConfig = {
  api: {
    url: 'http://localhost:3001',
  },
  project: 'lingx',
  defaultSpace: 'default',
  defaultBranch: 'main',
  format: {
    type: 'json',
    nested: true,
    indentation: 2,
  },
  paths: {
    translations: './public/locales',
    source: './src',
  },
  pull: {
    languages: [],
    filePattern: '{lang}.json',
  },
  push: {
    filePattern: '{lang}.json',
  },
  extract: {
    framework: 'nextjs',
    patterns: ['**/*.tsx', '**/*.ts'],
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    functions: ['t', 'useTranslation'],
    markerFunctions: ['tKey'],
  },
  types: {
    enabled: true,
    output: './src/lingx.d.ts',
    sourceLocale: 'en',
  },
};

export default config;
