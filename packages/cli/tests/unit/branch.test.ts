import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

// Mock modules before importing
vi.mock('../../src/lib/api.js', () => ({
  createApiClientFromConfig: vi.fn(),
}));

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Import after mocks
import { createApiClientFromConfig } from '../../src/lib/api.js';
import { loadConfig } from '../../src/lib/config.js';
import inquirer from 'inquirer';

// Import types statically for type checking
import type { DiffData } from '../../src/lib/diff/display.js';

// Mock console.log to capture output
const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('Diff Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should format added keys section', async () => {
    const { formatDiffOutput } = await import('../../src/lib/diff/display.js');

    const diff: DiffData = {
      source: { id: '1', name: 'feature' },
      target: { id: '2', name: 'main' },
      added: [{ key: 'new.key', translations: { en: 'New Value' } }],
      modified: [],
      deleted: [],
      conflicts: [],
    };

    const output = formatDiffOutput(diff);
    expect(output).toContain('Added');
    expect(output).toContain('new.key');
  });

  it('should format modified keys with changes', async () => {
    const { formatDiffOutput } = await import('../../src/lib/diff/display.js');

    const diff: DiffData = {
      source: { id: '1', name: 'feature' },
      target: { id: '2', name: 'main' },
      added: [],
      modified: [
        {
          key: 'changed.key',
          source: { en: 'New Value' },
          target: { en: 'Old Value' },
        },
      ],
      deleted: [],
      conflicts: [],
    };

    const output = formatDiffOutput(diff);
    expect(output).toContain('Modified');
    expect(output).toContain('changed.key');
  });

  it('should format deleted keys section', async () => {
    const { formatDiffOutput } = await import('../../src/lib/diff/display.js');

    const diff: DiffData = {
      source: { id: '1', name: 'feature' },
      target: { id: '2', name: 'main' },
      added: [],
      modified: [],
      deleted: [{ key: 'removed.key', translations: { en: 'Old Value' } }],
      conflicts: [],
    };

    const output = formatDiffOutput(diff);
    expect(output).toContain('Deleted');
    expect(output).toContain('removed.key');
  });

  it('should format conflicts with both values', async () => {
    const { formatDiffOutput } = await import('../../src/lib/diff/display.js');

    const diff: DiffData = {
      source: { id: '1', name: 'feature' },
      target: { id: '2', name: 'main' },
      added: [],
      modified: [],
      deleted: [],
      conflicts: [
        {
          key: 'conflict.key',
          source: { en: 'Source Value' },
          target: { en: 'Target Value' },
        },
      ],
    };

    const output = formatDiffOutput(diff);
    expect(output).toContain('Conflicts');
    expect(output).toContain('conflict.key');
    expect(output).toContain('Source Value');
    expect(output).toContain('Target Value');
  });

  it('should show no changes message for empty diff', async () => {
    const { formatDiffOutput } = await import('../../src/lib/diff/display.js');

    const diff: DiffData = {
      source: { id: '1', name: 'feature' },
      target: { id: '2', name: 'main' },
      added: [],
      modified: [],
      deleted: [],
      conflicts: [],
    };

    const output = formatDiffOutput(diff);
    expect(output).toContain('No changes');
  });

  it('should truncate long strings', async () => {
    const { formatDiffOutput } = await import('../../src/lib/diff/display.js');

    const longValue = 'A'.repeat(100);
    const diff: DiffData = {
      source: { id: '1', name: 'feature' },
      target: { id: '2', name: 'main' },
      added: [{ key: 'long.key', translations: { en: longValue } }],
      modified: [],
      deleted: [],
      conflicts: [],
    };

    const output = formatDiffOutput(diff);
    expect(output).toContain('...');
    expect(output).not.toContain(longValue);
  });
});

describe('Branch List Command', () => {
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
        patterns: ['src/**/*.tsx'],
        exclude: [],
        functions: ['t'],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a command named "list"', async () => {
    const { createBranchListCommand } = await import(
      '../../src/commands/branch/list.js'
    );
    const command = createBranchListCommand();
    expect(command).toBeInstanceOf(Command);
    expect(command.name()).toBe('list');
  });

  it('should have project and space options', async () => {
    const { createBranchListCommand } = await import(
      '../../src/commands/branch/list.js'
    );
    const command = createBranchListCommand();
    const options = command.options.map((o) => o.long);

    expect(options).toContain('--project');
    expect(options).toContain('--space');
  });

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

    const { createBranchListCommand } = await import(
      '../../src/commands/branch/list.js'
    );
    const command = createBranchListCommand();

    await command.parseAsync(['node', 'test']);

    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('should list branches from the API', async () => {
    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [
            {
              id: 'branch-1',
              name: 'main',
              isDefault: true,
              createdAt: '2024-01-01T00:00:00Z',
              keyCount: 100,
            },
            {
              id: 'branch-2',
              name: 'feature',
              isDefault: false,
              createdAt: '2024-01-02T00:00:00Z',
              keyCount: 50,
            },
          ],
        }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchListCommand } = await import(
      '../../src/commands/branch/list.js'
    );
    const command = createBranchListCommand();

    await command.parseAsync(['node', 'test']);

    expect(mockClient.get).toHaveBeenCalledWith('/api/projects/test-project/spaces');
    expect(mockClient.get).toHaveBeenCalledWith('/api/spaces/space-1/branches');
  });
});

describe('Branch Create Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
        patterns: ['src/**/*.tsx'],
        exclude: [],
        functions: ['t'],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a command named "create"', async () => {
    const { createBranchCreateCommand } = await import(
      '../../src/commands/branch/create.js'
    );
    const command = createBranchCreateCommand();
    expect(command).toBeInstanceOf(Command);
    expect(command.name()).toBe('create');
  });

  it('should have from, project, and space options', async () => {
    const { createBranchCreateCommand } = await import(
      '../../src/commands/branch/create.js'
    );
    const command = createBranchCreateCommand();
    const options = command.options.map((o) => o.long);

    expect(options).toContain('--from');
    expect(options).toContain('--project');
    expect(options).toContain('--space');
  });

  it('should accept branch name as argument', async () => {
    const { createBranchCreateCommand } = await import(
      '../../src/commands/branch/create.js'
    );
    const command = createBranchCreateCommand();

    // Check that command expects an argument
    expect(command.registeredArguments.length).toBeGreaterThan(0);
    expect(command.registeredArguments[0].name()).toBe('name');
  });

  it('should create branch via API', async () => {
    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [{ id: 'branch-1', name: 'main' }],
        }),
      post: vi.fn().mockResolvedValue({
        id: 'branch-2',
        name: 'feature-test',
        keyCount: 100,
      }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchCreateCommand } = await import(
      '../../src/commands/branch/create.js'
    );
    const command = createBranchCreateCommand();

    await command.parseAsync(['node', 'test', 'feature-test']);

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/spaces/space-1/branches',
      expect.objectContaining({
        name: 'feature-test',
        fromBranchId: 'branch-1',
      })
    );
  });
});

describe('Branch Diff Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
        patterns: ['src/**/*.tsx'],
        exclude: [],
        functions: ['t'],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a command named "diff"', async () => {
    const { createBranchDiffCommand } = await import(
      '../../src/commands/branch/diff.js'
    );
    const command = createBranchDiffCommand();
    expect(command).toBeInstanceOf(Command);
    expect(command.name()).toBe('diff');
  });

  it('should accept source and target branch arguments', async () => {
    const { createBranchDiffCommand } = await import(
      '../../src/commands/branch/diff.js'
    );
    const command = createBranchDiffCommand();

    expect(command.registeredArguments.length).toBeGreaterThanOrEqual(1);
    expect(command.registeredArguments[0].name()).toBe('source');
  });

  it('should fetch diff from API', async () => {
    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [
            { id: 'branch-1', name: 'main' },
            { id: 'branch-2', name: 'feature' },
          ],
        })
        .mockResolvedValueOnce({
          source: { id: 'branch-2', name: 'feature' },
          target: { id: 'branch-1', name: 'main' },
          added: [],
          modified: [],
          deleted: [],
          conflicts: [],
        }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchDiffCommand } = await import(
      '../../src/commands/branch/diff.js'
    );
    const command = createBranchDiffCommand();

    await command.parseAsync(['node', 'test', 'feature', 'main']);

    expect(mockClient.get).toHaveBeenCalledWith('/api/branches/branch-2/diff/branch-1');
  });
});

describe('Branch Merge Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
        patterns: ['src/**/*.tsx'],
        exclude: [],
        functions: ['t'],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a command named "merge"', async () => {
    const { createBranchMergeCommand } = await import(
      '../../src/commands/branch/merge.js'
    );
    const command = createBranchMergeCommand();
    expect(command).toBeInstanceOf(Command);
    expect(command.name()).toBe('merge');
  });

  it('should have into, interactive, and force options', async () => {
    const { createBranchMergeCommand } = await import(
      '../../src/commands/branch/merge.js'
    );
    const command = createBranchMergeCommand();
    const options = command.options.map((o) => o.long);

    expect(options).toContain('--into');
    expect(options).toContain('--interactive');
    expect(options).toContain('--force');
  });

  it('should merge via API with no conflicts', async () => {
    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [
            { id: 'branch-1', name: 'main' },
            { id: 'branch-2', name: 'feature' },
          ],
        })
        .mockResolvedValueOnce({
          source: { id: 'branch-2', name: 'feature' },
          target: { id: 'branch-1', name: 'main' },
          added: [{ key: 'new.key', translations: { en: 'New' } }],
          modified: [],
          deleted: [],
          conflicts: [],
        }),
      post: vi.fn().mockResolvedValue({
        success: true,
        merged: 1,
      }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchMergeCommand } = await import(
      '../../src/commands/branch/merge.js'
    );
    const command = createBranchMergeCommand();

    await command.parseAsync(['node', 'test', 'feature']);

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/branches/branch-2/merge',
      expect.objectContaining({
        targetBranchId: 'branch-1',
      })
    );
  });

  it('should exit with code 1 when conflicts exist without force or interactive', async () => {
    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [
            { id: 'branch-1', name: 'main' },
            { id: 'branch-2', name: 'feature' },
          ],
        })
        .mockResolvedValueOnce({
          source: { id: 'branch-2', name: 'feature' },
          target: { id: 'branch-1', name: 'main' },
          added: [],
          modified: [],
          deleted: [],
          conflicts: [
            {
              key: 'conflict.key',
              source: { en: 'Source' },
              target: { en: 'Target' },
            },
          ],
        }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchMergeCommand } = await import(
      '../../src/commands/branch/merge.js'
    );
    const command = createBranchMergeCommand();

    await command.parseAsync(['node', 'test', 'feature']);

    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('should merge with force option to resolve conflicts', async () => {
    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [
            { id: 'branch-1', name: 'main' },
            { id: 'branch-2', name: 'feature' },
          ],
        })
        .mockResolvedValueOnce({
          source: { id: 'branch-2', name: 'feature' },
          target: { id: 'branch-1', name: 'main' },
          added: [],
          modified: [],
          deleted: [],
          conflicts: [
            {
              key: 'conflict.key',
              source: { en: 'Source' },
              target: { en: 'Target' },
            },
          ],
        }),
      post: vi.fn().mockResolvedValue({
        success: true,
        merged: 1,
      }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchMergeCommand } = await import(
      '../../src/commands/branch/merge.js'
    );
    const command = createBranchMergeCommand();

    await command.parseAsync(['node', 'test', 'feature', '--force']);

    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/branches/branch-2/merge',
      expect.objectContaining({
        targetBranchId: 'branch-1',
        resolutions: [{ key: 'conflict.key', resolution: 'source' }],
      })
    );
  });

  it('should merge with interactive option to resolve conflicts', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'source' });

    const mockClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          spaces: [{ id: 'space-1', slug: 'frontend' }],
        })
        .mockResolvedValueOnce({
          branches: [
            { id: 'branch-1', name: 'main' },
            { id: 'branch-2', name: 'feature' },
          ],
        })
        .mockResolvedValueOnce({
          source: { id: 'branch-2', name: 'feature' },
          target: { id: 'branch-1', name: 'main' },
          added: [],
          modified: [],
          deleted: [],
          conflicts: [
            {
              key: 'conflict.key',
              source: { en: 'Source' },
              target: { en: 'Target' },
            },
          ],
        }),
      post: vi.fn().mockResolvedValue({
        success: true,
        merged: 1,
      }),
    };
    vi.mocked(createApiClientFromConfig).mockResolvedValue(mockClient as never);

    const { createBranchMergeCommand } = await import(
      '../../src/commands/branch/merge.js'
    );
    const command = createBranchMergeCommand();

    await command.parseAsync(['node', 'test', 'feature', '--interactive']);

    expect(inquirer.prompt).toHaveBeenCalled();
    expect(mockClient.post).toHaveBeenCalledWith(
      '/api/branches/branch-2/merge',
      expect.objectContaining({
        targetBranchId: 'branch-1',
        resolutions: [{ key: 'conflict.key', resolution: 'source' }],
      })
    );
  });
});

describe('Branch Command Group', () => {
  it('should create a command group named "branch"', async () => {
    const { createBranchCommand } = await import(
      '../../src/commands/branch/index.js'
    );
    const command = createBranchCommand();
    expect(command).toBeInstanceOf(Command);
    expect(command.name()).toBe('branch');
  });

  it('should have list, create, diff, and merge subcommands', async () => {
    const { createBranchCommand } = await import(
      '../../src/commands/branch/index.js'
    );
    const command = createBranchCommand();
    const subcommands = command.commands.map((c) => c.name());

    expect(subcommands).toContain('list');
    expect(subcommands).toContain('create');
    expect(subcommands).toContain('diff');
    expect(subcommands).toContain('merge');
  });
});
