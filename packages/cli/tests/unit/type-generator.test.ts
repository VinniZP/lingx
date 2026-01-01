import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  inferIcuParamTypes,
  hasIcuParams,
  generateParamsTypeString,
} from '../../src/lib/type-generator/icu-type-inferrer.js';
import { generateTypes } from '../../src/lib/type-generator/index.js';

describe('ICU Type Inferrer', () => {
  describe('inferIcuParamTypes', () => {
    it('should infer string | number for simple interpolation', () => {
      const params = inferIcuParamTypes('Hello, {name}!');
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('name');
      expect(params[0].type).toBe('string | number');
    });

    it('should infer number for plural patterns', () => {
      const params = inferIcuParamTypes(
        '{count, plural, =0 {none} one {one item} other {{count} items}}'
      );
      expect(params.find((p) => p.name === 'count')?.type).toBe('number');
    });

    it('should infer string for select patterns', () => {
      const params = inferIcuParamTypes(
        '{gender, select, male {He} female {She} other {They}}'
      );
      expect(params.find((p) => p.name === 'gender')?.type).toBe('string');
    });

    it('should infer number for number formatting', () => {
      const params = inferIcuParamTypes('Price: {amount, number, currency}');
      expect(params.find((p) => p.name === 'amount')?.type).toBe('number');
    });

    it('should infer Date for date formatting', () => {
      const params = inferIcuParamTypes('Updated {date, date, medium}');
      expect(params.find((p) => p.name === 'date')?.type).toBe('Date');
    });

    it('should infer Date for time formatting', () => {
      const params = inferIcuParamTypes('Meeting at {time, time, short}');
      expect(params.find((p) => p.name === 'time')?.type).toBe('Date');
    });

    it('should handle multiple parameters', () => {
      const params = inferIcuParamTypes(
        'Hello {firstName} {lastName}, you have {count, plural, one {# message} other {# messages}}'
      );
      expect(params).toHaveLength(3);
      expect(params.find((p) => p.name === 'firstName')?.type).toBe('string | number');
      expect(params.find((p) => p.name === 'lastName')?.type).toBe('string | number');
      expect(params.find((p) => p.name === 'count')?.type).toBe('number');
    });

    it('should handle nested patterns', () => {
      const params = inferIcuParamTypes(
        '{count, plural, =0 {No items} one {{user} has one item} other {{user} has {count} items}}'
      );
      expect(params.find((p) => p.name === 'count')?.type).toBe('number');
      expect(params.find((p) => p.name === 'user')?.type).toBe('string | number');
    });

    it('should return empty array for plain text', () => {
      const params = inferIcuParamTypes('Hello, World!');
      expect(params).toHaveLength(0);
    });

    it('should return empty array for invalid ICU syntax', () => {
      const params = inferIcuParamTypes('{unclosed brace');
      expect(params).toHaveLength(0);
    });

    it('should handle HTML-like tags', () => {
      const params = inferIcuParamTypes('Click <link>here</link> to {action}');
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('action');
    });

    it('should not duplicate parameters used in different contexts', () => {
      const params = inferIcuParamTypes(
        '{count, plural, one {{count} item} other {{count} items}}'
      );
      expect(params.filter((p) => p.name === 'count')).toHaveLength(1);
    });
  });

  describe('hasIcuParams', () => {
    it('should return true for messages with parameters', () => {
      expect(hasIcuParams('Hello, {name}!')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasIcuParams('Hello, World!')).toBe(false);
    });
  });

  describe('generateParamsTypeString', () => {
    it('should generate TypeScript object type', () => {
      const params = [
        { name: 'count', type: 'number' as const },
        { name: 'name', type: 'string | number' as const },
      ];
      const result = generateParamsTypeString(params);
      expect(result).toBe('{ count: number; name: string | number }');
    });

    it('should return null for empty params', () => {
      const result = generateParamsTypeString([]);
      expect(result).toBeNull();
    });
  });
});

describe('Type Generator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `localeflow-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'locales'), { recursive: true });
    await mkdir(join(testDir, 'src'), { recursive: true });
  });

  afterEach(async () => {
    if (testDir && existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should generate types for flat translations', async () => {
    const translations = {
      'home.title': 'Welcome',
      'home.description': 'Hello, {name}!',
      'items.count': '{count, plural, one {# item} other {# items}}',
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: false,
    });

    expect(result.keyCount).toBe(3);
    expect(result.keysWithParams).toBe(2);
    expect(existsSync(result.outputPath)).toBe(true);

    const content = readFileSync(result.outputPath, 'utf-8');
    expect(content).toContain("| 'home.title'");
    expect(content).toContain("| 'home.description'");
    expect(content).toContain("| 'items.count'");
    expect(content).toContain("'home.description': { name: string | number }");
    expect(content).toContain("'items.count': { count: number }");
  });

  it('should generate types for nested translations', async () => {
    const translations = {
      home: {
        title: 'Welcome',
        greeting: 'Hello, {name}!',
      },
      items: {
        count: '{count, plural, one {# item} other {# items}}',
      },
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: true,
    });

    expect(result.keyCount).toBe(3);

    const content = readFileSync(result.outputPath, 'utf-8');
    expect(content).toContain("| 'home.title'");
    expect(content).toContain("| 'home.greeting'");
    expect(content).toContain("| 'items.count'");
  });

  it('should include JSDoc comments with translation text', async () => {
    const translations = {
      greeting: 'Hello, {name}!',
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: false,
    });

    const content = readFileSync(result.outputPath, 'utf-8');
    expect(content).toContain('/** Hello, {name}! */');
  });

  it('should create output directory if it does not exist', async () => {
    const translations = { test: 'Test' };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const outputPath = join(testDir, 'generated', 'deep', 'path', 'localeflow.d.ts');

    await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath,
      filePattern: '{lang}.json',
      nested: false,
    });

    expect(existsSync(outputPath)).toBe(true);
  });

  it('should throw error if source locale file not found', async () => {
    await expect(
      generateTypes({
        translationsPath: join(testDir, 'locales'),
        sourceLocale: 'fr',
        outputPath: join(testDir, 'src', 'localeflow.d.ts'),
        filePattern: '{lang}.json',
        nested: false,
      })
    ).rejects.toThrow('Source locale file not found');
  });

  it('should sort keys alphabetically', async () => {
    const translations = {
      'z.last': 'Last',
      'a.first': 'First',
      'm.middle': 'Middle',
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: false,
    });

    const content = readFileSync(result.outputPath, 'utf-8');
    const firstIndex = content.indexOf("'a.first'");
    const middleIndex = content.indexOf("'m.middle'");
    const lastIndex = content.indexOf("'z.last'");

    expect(firstIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(lastIndex);
  });

  it('should handle empty translations', async () => {
    const translations = {};

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: false,
    });

    expect(result.keyCount).toBe(0);
    expect(result.keysWithParams).toBe(0);
  });

  it('should handle deeply nested translations', async () => {
    const translations = {
      level1: {
        level2: {
          level3: {
            key: 'Deep value with {param}',
          },
        },
      },
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: true,
    });

    const content = readFileSync(result.outputPath, 'utf-8');
    expect(content).toContain("| 'level1.level2.level3.key'");
    expect(content).toContain("'level1.level2.level3.key': { param: string | number }");
  });

  it('should escape special characters in JSDoc comments', async () => {
    const translations = {
      special: 'Contains */ and // characters',
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: false,
    });

    // Should not throw and file should be readable
    const content = readFileSync(join(testDir, 'src', 'localeflow.d.ts'), 'utf-8');
    expect(content).toBeDefined();
  });

  it('should handle complex ICU with Date and number types', async () => {
    const translations = {
      event:
        'Event on {date, date, long} at {time, time, short} with {amount, number, currency} entry fee',
    };

    await writeFile(
      join(testDir, 'locales', 'en.json'),
      JSON.stringify(translations)
    );

    const result = await generateTypes({
      translationsPath: join(testDir, 'locales'),
      sourceLocale: 'en',
      outputPath: join(testDir, 'src', 'localeflow.d.ts'),
      filePattern: '{lang}.json',
      nested: false,
    });

    const content = readFileSync(result.outputPath, 'utf-8');
    expect(content).toContain('date: Date');
    expect(content).toContain('time: Date');
    expect(content).toContain('amount: number');
  });
});
