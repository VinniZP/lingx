import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { JsonFormatter } from '../../src/lib/formatter/json.js';
import { YamlFormatter } from '../../src/lib/formatter/yaml.js';
import {
  extractLanguageFromFilename,
  writeTranslationFile,
  readTranslationFiles,
} from '../../src/lib/translation-io.js';

function createUniqueTempDir(): string {
  const randomSuffix = randomBytes(8).toString('hex');
  return join(tmpdir(), `lingx-test-${Date.now()}-${randomSuffix}`);
}

describe('extractLanguageFromFilename', () => {
  it('should extract language from simple pattern {lang}.json', () => {
    const lang = extractLanguageFromFilename('en.json', '{lang}.json');
    expect(lang).toBe('en');
  });

  it('should extract language from pattern with prefix', () => {
    const lang = extractLanguageFromFilename('messages-en.json', 'messages-{lang}.json');
    expect(lang).toBe('en');
  });

  it('should extract language from pattern with directory', () => {
    const lang = extractLanguageFromFilename('en.json', 'locales/{lang}.json');
    expect(lang).toBe('en');
  });

  it('should fallback to filename without extension when pattern does not match', () => {
    const lang = extractLanguageFromFilename('de.json', 'invalid-pattern');
    expect(lang).toBe('de');
  });

  it('should handle yaml extensions', () => {
    const lang = extractLanguageFromFilename('fr.yaml', '{lang}.yaml');
    expect(lang).toBe('fr');
  });

  it('should handle language codes with regions', () => {
    const lang = extractLanguageFromFilename('en-US.json', '{lang}.json');
    expect(lang).toBe('en-US');
  });
});

describe('Translation File I/O', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = createUniqueTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('writeTranslationFile', () => {
    it('should write JSON translation file', async () => {
      const formatter = new JsonFormatter({ nested: true, indentation: 2 });
      const translations = {
        'home.title': 'Welcome',
        'home.description': 'Description',
      };

      const filePath = join(tempDir, 'en.json');
      await writeTranslationFile(filePath, translations, formatter);

      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.home.title).toBe('Welcome');
      expect(parsed.home.description).toBe('Description');
    });

    it('should write YAML translation file', async () => {
      const formatter = new YamlFormatter({ nested: true, indentation: 2 });
      const translations = {
        'home.title': 'Welcome',
      };

      const filePath = join(tempDir, 'en.yaml');
      await writeTranslationFile(filePath, translations, formatter);

      const content = await readFile(filePath, 'utf-8');
      expect(content).toContain('home:');
      expect(content).toContain('title: Welcome');
    });

    it('should create parent directories if needed', async () => {
      const formatter = new JsonFormatter({ nested: true, indentation: 2 });
      const translations = { key: 'value' };

      const filePath = join(tempDir, 'nested', 'dir', 'en.json');
      await writeTranslationFile(filePath, translations, formatter);

      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('readTranslationFiles', () => {
    it('should read all JSON files from directory', async () => {
      const enContent = JSON.stringify({ home: { title: 'Welcome' } });
      const deContent = JSON.stringify({ home: { title: 'Willkommen' } });

      await writeFile(join(tempDir, 'en.json'), enContent);
      await writeFile(join(tempDir, 'de.json'), deContent);

      const formatter = new JsonFormatter({ nested: true, indentation: 2 });
      const result = await readTranslationFiles(tempDir, 'json', formatter, '{lang}.json');

      expect(result.en).toEqual({ 'home.title': 'Welcome' });
      expect(result.de).toEqual({ 'home.title': 'Willkommen' });
    });

    it('should read all YAML files from directory', async () => {
      const content = `home:
  title: Welcome
`;
      await writeFile(join(tempDir, 'en.yaml'), content);

      const formatter = new YamlFormatter({ nested: true, indentation: 2 });
      const result = await readTranslationFiles(tempDir, 'yaml', formatter, '{lang}.yaml');

      expect(result.en).toEqual({ 'home.title': 'Welcome' });
    });

    it('should handle .yml extension for YAML files', async () => {
      const content = `key: value
`;
      await writeFile(join(tempDir, 'en.yml'), content);

      const formatter = new YamlFormatter({ nested: false, indentation: 2 });
      const result = await readTranslationFiles(tempDir, 'yaml', formatter, '{lang}.yml');

      expect(result.en).toEqual({ key: 'value' });
    });

    it('should return empty object when directory is empty', async () => {
      const formatter = new JsonFormatter({ nested: true, indentation: 2 });
      const result = await readTranslationFiles(tempDir, 'json', formatter, '{lang}.json');

      expect(result).toEqual({});
    });

    it('should skip non-matching files', async () => {
      await writeFile(join(tempDir, 'en.json'), '{"key": "value"}');
      await writeFile(join(tempDir, 'readme.txt'), 'Not a translation file');
      await writeFile(join(tempDir, '.gitkeep'), '');

      const formatter = new JsonFormatter({ nested: false, indentation: 2 });
      const result = await readTranslationFiles(tempDir, 'json', formatter, '{lang}.json');

      expect(Object.keys(result)).toEqual(['en']);
    });
  });
});

describe('Diff computation for sync', () => {
  it('should identify local-only keys', () => {
    const local = {
      en: { 'key.local': 'Local value' },
    };
    const remote = {
      en: {},
    };

    const diff = computeDiff(local, remote);
    expect(diff.localOnly).toContainEqual({
      lang: 'en',
      key: 'key.local',
      value: 'Local value',
    });
    expect(diff.remoteOnly).toEqual([]);
    expect(diff.conflicts).toEqual([]);
  });

  it('should identify remote-only keys', () => {
    const local = {
      en: {},
    };
    const remote = {
      en: { 'key.remote': 'Remote value' },
    };

    const diff = computeDiff(local, remote);
    expect(diff.localOnly).toEqual([]);
    expect(diff.remoteOnly).toContainEqual({
      lang: 'en',
      key: 'key.remote',
      value: 'Remote value',
    });
    expect(diff.conflicts).toEqual([]);
  });

  it('should identify conflicts when same key has different values', () => {
    const local = {
      en: { 'key.common': 'Local version' },
    };
    const remote = {
      en: { 'key.common': 'Remote version' },
    };

    const diff = computeDiff(local, remote);
    expect(diff.localOnly).toEqual([]);
    expect(diff.remoteOnly).toEqual([]);
    expect(diff.conflicts).toContainEqual({
      lang: 'en',
      key: 'key.common',
      localValue: 'Local version',
      remoteValue: 'Remote version',
    });
  });

  it('should not flag as conflict when values are identical', () => {
    const local = {
      en: { 'key.same': 'Same value' },
    };
    const remote = {
      en: { 'key.same': 'Same value' },
    };

    const diff = computeDiff(local, remote);
    expect(diff.localOnly).toEqual([]);
    expect(diff.remoteOnly).toEqual([]);
    expect(diff.conflicts).toEqual([]);
  });

  it('should handle multiple languages', () => {
    const local = {
      en: { 'greeting': 'Hello' },
      de: { 'greeting': 'Hallo' },
    };
    const remote = {
      en: { 'greeting': 'Hello' },
      fr: { 'greeting': 'Bonjour' },
    };

    const diff = computeDiff(local, remote);
    expect(diff.localOnly).toContainEqual({
      lang: 'de',
      key: 'greeting',
      value: 'Hallo',
    });
    expect(diff.remoteOnly).toContainEqual({
      lang: 'fr',
      key: 'greeting',
      value: 'Bonjour',
    });
  });
});

// Helper function to compute diff between local and remote translations
function computeDiff(
  local: Record<string, Record<string, string>>,
  remote: Record<string, Record<string, string>>
) {
  const localOnly: { lang: string; key: string; value: string }[] = [];
  const remoteOnly: { lang: string; key: string; value: string }[] = [];
  const conflicts: { lang: string; key: string; localValue: string; remoteValue: string }[] = [];

  const allLanguages = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const lang of allLanguages) {
    const localTrans = local[lang] ?? {};
    const remoteTrans = remote[lang] ?? {};

    const allKeys = new Set([...Object.keys(localTrans), ...Object.keys(remoteTrans)]);

    for (const key of allKeys) {
      const localValue = localTrans[key];
      const remoteValue = remoteTrans[key];

      if (localValue && !remoteValue) {
        localOnly.push({ lang, key, value: localValue });
      } else if (!localValue && remoteValue) {
        remoteOnly.push({ lang, key, value: remoteValue });
      } else if (localValue && remoteValue && localValue !== remoteValue) {
        conflicts.push({ lang, key, localValue, remoteValue });
      }
    }
  }

  return { localOnly, remoteOnly, conflicts };
}
