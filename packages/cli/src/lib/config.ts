import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export interface LocaleflowConfig {
  api: {
    url: string;
  };
  project?: string;
  defaultSpace?: string;
  defaultBranch: string;
  format: {
    type: 'json' | 'yaml';
    nested: boolean;
    indentation: number;
  };
  paths: {
    translations: string;
    source: string;
  };
  pull: {
    languages: string[];
    filePattern: string;
  };
  push: {
    filePattern: string;
  };
  extract: {
    framework: 'nextjs' | 'angular';
    patterns: string[];
    exclude: string[];
    functions: string[];
  };
}

const DEFAULT_CONFIG: LocaleflowConfig = {
  api: {
    url: 'http://localhost:3001',
  },
  defaultBranch: 'main',
  format: {
    type: 'json',
    nested: true,
    indentation: 2,
  },
  paths: {
    translations: './locales',
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
    patterns: ['src/**/*.tsx', 'src/**/*.ts'],
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    functions: ['t', 'useTranslation'],
  },
};

const CONFIG_FILE_NAMES = [
  '.localeflow.yml',
  '.localeflow.yaml',
  'localeflow.config.yml',
  'localeflow.config.yaml',
];

export async function loadConfig(projectDir: string): Promise<LocaleflowConfig> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(projectDir, fileName);
    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8');
      const parsed = yaml.load(content) as Partial<LocaleflowConfig>;
      return mergeConfig(DEFAULT_CONFIG, parsed);
    }
  }
  return DEFAULT_CONFIG;
}

function mergeConfig(
  defaults: LocaleflowConfig,
  overrides: Partial<LocaleflowConfig>
): LocaleflowConfig {
  return {
    api: { ...defaults.api, ...overrides.api },
    project: overrides.project ?? defaults.project,
    defaultSpace: overrides.defaultSpace ?? defaults.defaultSpace,
    defaultBranch: overrides.defaultBranch ?? defaults.defaultBranch,
    format: { ...defaults.format, ...overrides.format },
    paths: { ...defaults.paths, ...overrides.paths },
    pull: { ...defaults.pull, ...overrides.pull },
    push: { ...defaults.push, ...overrides.push },
    extract: { ...defaults.extract, ...overrides.extract },
  };
}

export function getConfigPath(projectDir: string): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(projectDir, fileName);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}
