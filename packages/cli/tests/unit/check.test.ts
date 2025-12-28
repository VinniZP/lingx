import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

// Mock modules before importing
vi.mock('../../src/lib/api.js', () => ({
  createApiClientFromConfig: vi.fn(),
}));

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('glob', () => ({
  glob: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Import after mocks
import { createCheckCommand } from '../../src/commands/check.js';
import { createApiClientFromConfig } from '../../src/lib/api.js';
import { loadConfig } from '../../src/lib/config.js';
import { glob } from 'glob';
import { readFile } from 'fs/promises';

// Mock console.log to capture output
const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('Check Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(loadConfig).mockResolvedValue({
      api: { url: 'http://localhost:3001' },
      project: 'test-project',
      defaultSpace: 'frontend',
      defaultBranch: 'main',
      format: { type: 'json', nested: true, indentation: 2 },
      paths: { translations: './locales', source: './src' },
      pull: { languages: [], filePattern: '{lang}.json' },
      push: { filePattern: '{lang}.json' },
      extract: {
        framework: 'nextjs',
        patterns: ['src/**/*.tsx', 'src/**/*.ts'],
        exclude: ['**/*.test.ts'],
        functions: ['t', 'useTranslation'],
      },
    });

    vi.mocked(glob).mockResolvedValue([]);
    vi.mocked(readFile).mockResolvedValue('');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckCommand', () => {
    it('should create a command named "check"', () => {
      const command = createCheckCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('check');
    });

    it('should have correct options', () => {
      const command = createCheckCommand();
      const options = command.options.map(o => o.long);

      expect(options).toContain('--project');
      expect(options).toContain('--space');
      expect(options).toContain('--branch');
      expect(options).toContain('--source');
      expect(options).toContain('--missing');
      expect(options).toContain('--unused');
      expect(options).toContain('--validate-icu');
    });

    it('should have a description', () => {
      const command = createCheckCommand();
      expect(command.description()).toBeTruthy();
    });
  });

  describe('check execution', () => {
    it('should exit with code 1 when project is not provided', async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        api: { url: 'http://localhost:3001' },
        project: undefined,
        defaultSpace: 'frontend',
        defaultBranch: 'main',
        format: { type: 'json', nested: true, indentation: 2 },
        paths: { translations: './locales', source: './src' },
        pull: { languages: [], filePattern: '{lang}.json' },
        push: { filePattern: '{lang}.json' },
        extract: {
          framework: 'nextjs',
          patterns: ['**/*.tsx'],
          exclude: [],
          functions: ['t'],
        },
      });

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--space', 'frontend']);

      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should exit with code 1 when space is not provided', async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        api: { url: 'http://localhost:3001' },
        project: 'test-project',
        defaultSpace: undefined,
        defaultBranch: 'main',
        format: { type: 'json', nested: true, indentation: 2 },
        paths: { translations: './locales', source: './src' },
        pull: { languages: [], filePattern: '{lang}.json' },
        push: { filePattern: '{lang}.json' },
        extract: {
          framework: 'nextjs',
          patterns: ['**/*.tsx'],
          exclude: [],
          functions: ['t'],
        },
      });

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--project', 'test-project']);

      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should extract keys and check against platform translations', async () => {
      // Mock file extraction
      vi.mocked(glob).mockResolvedValue(['/project/src/app.tsx']);
      vi.mocked(readFile).mockResolvedValue(`
        const { t } = useTranslation();
        const title = t('app.title');
        const desc = t('app.description');
      `);

      // Mock API client
      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'frontend' }],
          })
          .mockResolvedValueOnce({
            branches: [{ id: 'branch-1', name: 'main' }],
          })
          .mockResolvedValueOnce({
            translations: {
              en: {
                'app.title': 'Application Title',
                'app.description': 'Application Description',
              },
            },
            languages: ['en'],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--project', 'test-project', '--space', 'frontend']);

      // Should exit with 0 when all keys match
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should report missing keys and exit with code 1', async () => {
      // Mock file with key not on platform
      vi.mocked(glob).mockResolvedValue(['/project/src/app.tsx']);
      vi.mocked(readFile).mockResolvedValue(`
        const title = t('app.new_feature');
      `);

      // Mock API client with no matching key
      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'frontend' }],
          })
          .mockResolvedValueOnce({
            branches: [{ id: 'branch-1', name: 'main' }],
          })
          .mockResolvedValueOnce({
            translations: { en: {} },
            languages: ['en'],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--missing']);

      // Should exit with 1 for missing keys
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should report unused keys but exit with code 0', async () => {
      // Mock file with no keys
      vi.mocked(glob).mockResolvedValue(['/project/src/app.tsx']);
      vi.mocked(readFile).mockResolvedValue('// No translation keys');

      // Mock API with extra keys
      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'frontend' }],
          })
          .mockResolvedValueOnce({
            branches: [{ id: 'branch-1', name: 'main' }],
          })
          .mockResolvedValueOnce({
            translations: { en: { 'unused.key': 'Unused Value' } },
            languages: ['en'],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--unused']);

      // Unused keys are warnings, not errors - should exit with 0
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should validate ICU syntax and exit with code 1 for invalid syntax', async () => {
      // No source files needed for ICU-only check
      vi.mocked(glob).mockResolvedValue([]);

      // Mock API with invalid ICU syntax
      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'frontend' }],
          })
          .mockResolvedValueOnce({
            branches: [{ id: 'branch-1', name: 'main' }],
          })
          .mockResolvedValueOnce({
            translations: {
              en: { 'broken.key': '{unclosed' },
            },
            languages: ['en'],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--validate-icu']);

      // Should exit with 1 for ICU validation errors
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should validate ICU syntax and exit with code 0 for valid syntax', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      // Mock API with valid ICU syntax
      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'frontend' }],
          })
          .mockResolvedValueOnce({
            branches: [{ id: 'branch-1', name: 'main' }],
          })
          .mockResolvedValueOnce({
            translations: {
              en: {
                'greeting': 'Hello, {name}!',
                'count': '{count, plural, one {1 item} other {{count} items}}',
              },
            },
            languages: ['en'],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test', '--validate-icu']);

      // Should exit with 0 for valid ICU
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it('should handle space not found error', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'other-space' }],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test']);

      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should handle branch not found error', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      const mockClient = {
        get: vi.fn()
          .mockResolvedValueOnce({
            spaces: [{ id: 'space-1', slug: 'frontend' }],
          })
          .mockResolvedValueOnce({
            branches: [{ id: 'branch-1', name: 'other-branch' }],
          }),
      };
      vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

      const command = createCheckCommand();

      await command.parseAsync(['node', 'test']);

      expect(exitMock).toHaveBeenCalledWith(1);
    });
  });
});
