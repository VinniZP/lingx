import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkIndexTMCommand } from '../commands/bulk-index-tm.command.js';
import { BulkIndexTMHandler } from '../commands/bulk-index-tm.handler.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';

describe('BulkIndexTMHandler', () => {
  const mockRepository: {
    getApprovedTranslationsForIndexing: ReturnType<typeof vi.fn>;
    bulkUpsert: ReturnType<typeof vi.fn>;
  } = {
    getApprovedTranslationsForIndexing: vi.fn(),
    bulkUpsert: vi.fn(),
  };

  const mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  } = {
    info: vi.fn(),
    error: vi.fn(),
  };

  let handler: BulkIndexTMHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BulkIndexTMHandler(
      mockRepository as unknown as TranslationMemoryRepository,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should return zero indexed when no approved translations exist', async () => {
    const command = new BulkIndexTMCommand('project-1');

    mockRepository.getApprovedTranslationsForIndexing.mockResolvedValue([]);
    mockRepository.bulkUpsert.mockResolvedValue(0);

    const result = await handler.execute(command);

    expect(result).toEqual({ indexed: 0 });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { projectId: 'project-1' },
      '[TM] Starting bulk index'
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      { projectId: 'project-1', indexed: 0 },
      '[TM] Bulk index completed'
    );
    expect(mockRepository.bulkUpsert).toHaveBeenCalledWith('project-1', []);
  });

  it('should index all approved translations', async () => {
    const command = new BulkIndexTMCommand('project-1');

    const translations = [
      {
        targetLanguage: 'de',
        targetText: 'Hallo',
        keyId: 'key-1',
        branchId: 'branch-1',
        sourceText: 'Hello',
        sourceLanguage: 'en',
      },
      {
        targetLanguage: 'fr',
        targetText: 'Bonjour',
        keyId: 'key-1',
        branchId: 'branch-1',
        sourceText: 'Hello',
        sourceLanguage: 'en',
      },
    ];

    mockRepository.getApprovedTranslationsForIndexing.mockResolvedValue(translations);
    mockRepository.bulkUpsert.mockResolvedValue(2);

    const result = await handler.execute(command);

    expect(result).toEqual({ indexed: 2 });
    expect(mockRepository.bulkUpsert).toHaveBeenCalledWith('project-1', translations);
  });

  it('should log error and propagate when bulkUpsert fails', async () => {
    const command = new BulkIndexTMCommand('project-1');

    mockRepository.getApprovedTranslationsForIndexing.mockResolvedValue([
      {
        targetLanguage: 'de',
        targetText: 'Hallo',
        keyId: 'key-1',
        branchId: 'branch-1',
        sourceText: 'Hello',
        sourceLanguage: 'en',
      },
    ]);

    mockRepository.bulkUpsert.mockRejectedValue(new Error('Database error'));

    await expect(handler.execute(command)).rejects.toThrow('Database error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      { projectId: 'project-1', error: 'Database error' },
      '[TM] Bulk index failed'
    );
  });

  it('should log error and propagate when getApprovedTranslationsForIndexing fails', async () => {
    const command = new BulkIndexTMCommand('project-1');

    mockRepository.getApprovedTranslationsForIndexing.mockRejectedValue(new Error('Query failed'));

    await expect(handler.execute(command)).rejects.toThrow('Query failed');

    expect(mockLogger.error).toHaveBeenCalledWith(
      { projectId: 'project-1', error: 'Query failed' },
      '[TM] Bulk index failed'
    );
  });
});
