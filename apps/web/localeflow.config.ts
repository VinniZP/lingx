import type { LocaleflowConfig } from '@localeflow/cli';

const config: LocaleflowConfig = {
  api: {
    url: 'http://localhost:3001',
  },
  project: 'localeflow',
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
  },
};

export default config;
