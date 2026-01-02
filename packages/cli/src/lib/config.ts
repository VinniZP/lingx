import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { createJiti } from 'jiti';

export interface LingxConfig {
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
    languages?: string[];
  };
  extract: {
    framework: 'nextjs' | 'angular';
    patterns: string[];
    exclude: string[];
    functions: string[];
    /** Marker functions for key extraction (e.g., tKey). Default: ['tKey'] */
    markerFunctions?: string[];
  };
  /** TypeScript type generation configuration */
  types?: {
    /** Enable automatic type generation. Default: true */
    enabled: boolean;
    /** Output path for generated type file. Default: './src/lingx.d.ts' */
    output: string;
    /** Source locale to use for type generation. Default: 'en' */
    sourceLocale: string;
  };
  /** Near-key context detection configuration */
  context?: {
    /** Enable context detection. Default: true */
    enabled?: boolean;
    /** Auto-sync context on push. Default: true */
    syncOnPush?: boolean;
    /** Track component scope during extraction. Default: true */
    detectComponents?: boolean;
    /** Compute semantic similarity (slower). Default: false */
    semanticAnalysis?: boolean;
    /** Minimum similarity for semantic matches (0.5-1.0). Default: 0.7 */
    minSimilarity?: number;
  };
}

export const DEFAULT_CONFIG: LingxConfig = {
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
    markerFunctions: ['tKey'],
  },
  types: {
    enabled: true,
    output: './src/lingx.d.ts',
    sourceLocale: 'en',
  },
  context: {
    enabled: true,
    syncOnPush: true,
    detectComponents: true,
    semanticAnalysis: false,
    minSimilarity: 0.7,
  },
};

const CONFIG_FILE_NAMES = [
  'lingx.config.ts',
  '.lingx.yml',
  '.lingx.yaml',
  'lingx.config.yml',
  'lingx.config.yaml',
];

export async function loadConfig(projectDir: string): Promise<LingxConfig> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(projectDir, fileName);
    if (existsSync(filePath)) {
      if (fileName.endsWith('.ts')) {
        // Load TypeScript config using jiti
        const jiti = createJiti(import.meta.url);
        const module = await jiti.import(filePath);
        const parsed = ((module as Record<string, unknown>).default ?? (module as Record<string, unknown>).config) as Partial<LingxConfig>;
        return mergeConfig(DEFAULT_CONFIG, parsed);
      } else {
        // Load YAML config
        const content = await readFile(filePath, 'utf-8');
        const parsed = yaml.load(content) as Partial<LingxConfig>;
        return mergeConfig(DEFAULT_CONFIG, parsed);
      }
    }
  }
  return DEFAULT_CONFIG;
}

function mergeConfig(
  defaults: LingxConfig,
  overrides: Partial<LingxConfig>
): LingxConfig {
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
    types: overrides.types
      ? { ...defaults.types, ...overrides.types }
      : defaults.types,
    context: overrides.context
      ? { ...defaults.context, ...overrides.context }
      : defaults.context,
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
