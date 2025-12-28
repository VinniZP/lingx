import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig, getConfigPath, type LocaleflowConfig } from '../../src/lib/config.js';

describe('Config Parser', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `localeflow-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should load config from .localeflow.yml', async () => {
    const configContent = `
api:
  url: https://api.example.com
project: my-project
defaultBranch: develop
format:
  type: yaml
  nested: false
  indentation: 4
`;
    await writeFile(join(tempDir, '.localeflow.yml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.api.url).toBe('https://api.example.com');
    expect(config.project).toBe('my-project');
    expect(config.defaultBranch).toBe('develop');
    expect(config.format.type).toBe('yaml');
    expect(config.format.nested).toBe(false);
    expect(config.format.indentation).toBe(4);
  });

  it('should use default values for missing fields', async () => {
    const configContent = `
project: my-project
`;
    await writeFile(join(tempDir, '.localeflow.yml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.format.type).toBe('json');
    expect(config.defaultBranch).toBe('main');
    expect(config.format.nested).toBe(true);
    expect(config.format.indentation).toBe(2);
    expect(config.paths.translations).toBe('./locales');
    expect(config.paths.source).toBe('./src');
  });

  it('should return default config when no config file exists', async () => {
    const config = await loadConfig(tempDir);

    expect(config.api.url).toBe('http://localhost:3001');
    expect(config.defaultBranch).toBe('main');
    expect(config.format.type).toBe('json');
  });

  it('should support .localeflow.yaml extension', async () => {
    const configContent = `
api:
  url: https://yaml-extension.example.com
`;
    await writeFile(join(tempDir, '.localeflow.yaml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.api.url).toBe('https://yaml-extension.example.com');
  });

  it('should support localeflow.config.yml', async () => {
    const configContent = `
api:
  url: https://config-yml.example.com
`;
    await writeFile(join(tempDir, 'localeflow.config.yml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.api.url).toBe('https://config-yml.example.com');
  });

  it('should find config path correctly', async () => {
    await writeFile(join(tempDir, '.localeflow.yml'), 'api:\n  url: test');

    const configPath = getConfigPath(tempDir);
    expect(configPath).toBe(join(tempDir, '.localeflow.yml'));
  });

  it('should return null when no config file found', () => {
    const configPath = getConfigPath(tempDir);
    expect(configPath).toBeNull();
  });

  it('should merge nested config objects correctly', async () => {
    const configContent = `
format:
  type: yaml
paths:
  translations: ./i18n
`;
    await writeFile(join(tempDir, '.localeflow.yml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.format.type).toBe('yaml');
    expect(config.format.nested).toBe(true); // default preserved
    expect(config.paths.translations).toBe('./i18n');
    expect(config.paths.source).toBe('./src'); // default preserved
  });

  it('should parse pull and push configurations', async () => {
    const configContent = `
pull:
  languages:
    - en
    - de
    - fr
  filePattern: "{lang}/messages.json"
push:
  filePattern: "locales/{lang}.json"
`;
    await writeFile(join(tempDir, '.localeflow.yml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.pull.languages).toEqual(['en', 'de', 'fr']);
    expect(config.pull.filePattern).toBe('{lang}/messages.json');
    expect(config.push.filePattern).toBe('locales/{lang}.json');
  });

  it('should parse extract configuration', async () => {
    const configContent = `
extract:
  framework: angular
  patterns:
    - "src/**/*.component.ts"
    - "src/**/*.html"
  exclude:
    - "**/*.spec.ts"
  functions:
    - translate
    - i18n
`;
    await writeFile(join(tempDir, '.localeflow.yml'), configContent);

    const config = await loadConfig(tempDir);
    expect(config.extract.framework).toBe('angular');
    expect(config.extract.patterns).toContain('src/**/*.component.ts');
    expect(config.extract.exclude).toContain('**/*.spec.ts');
    expect(config.extract.functions).toContain('translate');
  });
});
