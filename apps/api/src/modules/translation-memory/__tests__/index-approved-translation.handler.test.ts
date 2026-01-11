import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexApprovedTranslationCommand } from '../commands/index-approved-translation.command.js';
import { IndexApprovedTranslationHandler } from '../commands/index-approved-translation.handler.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';

describe('IndexApprovedTranslationHandler', () => {
  const mockRepository: {
    getTranslationWithContext: ReturnType<typeof vi.fn>;
    upsertEntry: ReturnType<typeof vi.fn>;
  } = {
    getTranslationWithContext: vi.fn(),
    upsertEntry: vi.fn(),
  };

  const mockLogger: {
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  } = {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  let handler: IndexApprovedTranslationHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new IndexApprovedTranslationHandler(
      mockRepository as unknown as TranslationMemoryRepository,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  it('should skip indexing when translation not found', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue(null);

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { translationId: 'translation-1' },
      '[TM] Translation not found'
    );
    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when translation is not approved', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'DRAFT',
      language: 'de',
      value: 'Hallo',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: 'Hello',
    });

    await handler.execute(command);

    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when no default language is configured', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: 'Hallo',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: null, // No default language
      sourceText: null,
    });

    await handler.execute(command);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { projectId: 'project-1' },
      '[TM] No default language for project'
    );
    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when translation is for default language', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'en', // Same as default
      value: 'Hello',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: 'Hello',
    });

    await handler.execute(command);

    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when source translation is missing', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: 'Hallo',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: null, // No source text
    });

    await handler.execute(command);

    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when source translation is empty', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: 'Hallo',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: '   ', // Empty source text
    });

    await handler.execute(command);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      { translationId: 'translation-1' },
      '[TM] Skipping translation with empty source text'
    );
    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when target translation is empty', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: '   ', // Empty target text
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: 'Hello',
    });

    await handler.execute(command);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      { translationId: 'translation-1' },
      '[TM] Skipping translation with empty target text'
    );
    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should skip indexing when target translation is null', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: null, // Null target text
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: 'Hello',
    });

    await handler.execute(command);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      { translationId: 'translation-1' },
      '[TM] Skipping translation with empty target text'
    );
    expect(mockRepository.upsertEntry).not.toHaveBeenCalled();
  });

  it('should index approved translation into TM', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: 'Hallo',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: 'Hello',
    });

    mockRepository.upsertEntry.mockResolvedValue({});

    await handler.execute(command);

    expect(mockRepository.upsertEntry).toHaveBeenCalledWith({
      projectId: 'project-1',
      sourceLanguage: 'en',
      targetLanguage: 'de',
      sourceText: 'Hello',
      targetText: 'Hallo',
      sourceKeyId: 'key-1',
      sourceBranchId: 'branch-1',
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      { translationId: 'translation-1', sourceLanguage: 'en', targetLanguage: 'de' },
      '[TM] Indexed translation'
    );
  });

  it('should throw error when upsert fails', async () => {
    const command = new IndexApprovedTranslationCommand('project-1', 'translation-1');

    mockRepository.getTranslationWithContext.mockResolvedValue({
      id: 'translation-1',
      status: 'APPROVED',
      language: 'de',
      value: 'Hallo',
      keyId: 'key-1',
      branchId: 'branch-1',
      defaultLanguageCode: 'en',
      sourceText: 'Hello',
    });

    mockRepository.upsertEntry.mockRejectedValue(new Error('Database error'));

    await expect(handler.execute(command)).rejects.toThrow('Database error');

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
