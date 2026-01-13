import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus, IQueryBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { BulkTranslateCommand } from '../commands/bulk-translate.command.js';
import { BulkTranslateHandler } from '../commands/bulk-translate.handler.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

// Mock the queue
vi.mock('../../../lib/queues.js', () => ({
  mtBatchQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  },
}));

describe('BulkTranslateHandler', () => {
  const mockRepository: {
    getKeysWithTranslations: ReturnType<typeof vi.fn>;
    setTranslation: ReturnType<typeof vi.fn>;
  } = {
    getKeysWithTranslations: vi.fn(),
    setTranslation: vi.fn(),
  };

  const mockAccessService: {
    verifyBranchAccess: ReturnType<typeof vi.fn>;
  } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const mockQueryBus: {
    execute: ReturnType<typeof vi.fn>;
  } = {
    execute: vi.fn(),
  };

  const mockLogger: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  } = {
    error: vi.fn(),
    warn: vi.fn(),
  };

  let handler: BulkTranslateHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BulkTranslateHandler(
      mockRepository as unknown as TranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockQueryBus as unknown as IQueryBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('async/sync threshold logic', () => {
    it('should process synchronously when keyIds <= 5 and targets <= 3', async () => {
      const keyIds = ['key-1', 'key-2']; // 2 keys
      const targetLanguages = ['es', 'fr']; // 2 languages
      const command = new BulkTranslateCommand('branch-1', keyIds, targetLanguages, 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr', 'de'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [{ language: 'en', value: 'Hello' }],
        },
        {
          id: 'key-2',
          name: 'farewell',
          translations: [{ language: 'en', value: 'Goodbye' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({
        translatedText: 'Translated',
      });

      const result = await handler.execute(command);

      // Should be sync result (no jobId/async)
      expect(result).not.toHaveProperty('jobId');
      expect(result).not.toHaveProperty('async');
      expect(result).toHaveProperty('translated');
      expect(mockRepository.getKeysWithTranslations).toHaveBeenCalled();
    });

    it('should process asynchronously when keyIds > 5 (ASYNC_THRESHOLD_KEYS)', async () => {
      const keyIds = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6']; // 6 keys > 5
      const command = new BulkTranslateCommand('branch-1', keyIds, ['es'], 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      const result = await handler.execute(command);

      // Should be async result
      expect(result).toHaveProperty('jobId', 'job-123');
      expect(result).toHaveProperty('async', true);
      expect(mockRepository.getKeysWithTranslations).not.toHaveBeenCalled();
    });

    it('should process asynchronously when target languages > 3 (ASYNC_THRESHOLD_LANGS)', async () => {
      const keyIds = ['key-1']; // 1 key
      const targetLanguages = ['es', 'fr', 'de', 'it']; // 4 languages > 3
      const command = new BulkTranslateCommand('branch-1', keyIds, targetLanguages, 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr', 'de', 'it'],
      });

      const result = await handler.execute(command);

      // Should be async result
      expect(result).toHaveProperty('jobId', 'job-123');
      expect(result).toHaveProperty('async', true);
    });

    it('should process synchronously at exact threshold (5 keys, 3 languages)', async () => {
      const keyIds = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5']; // Exactly 5 keys
      const targetLanguages = ['es', 'fr', 'de']; // Exactly 3 languages
      const command = new BulkTranslateCommand('branch-1', keyIds, targetLanguages, 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr', 'de'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([]);

      const result = await handler.execute(command);

      // Should be sync result (at threshold, not over)
      expect(result).not.toHaveProperty('jobId');
      expect(result).not.toHaveProperty('async');
      expect(mockRepository.getKeysWithTranslations).toHaveBeenCalled();
    });
  });

  describe('translation processing', () => {
    it('should skip keys without source text', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], ['es'], 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'empty-key',
          translations: [], // No source translation
        },
      ]);

      const result = await handler.execute(command);

      expect(result).toEqual({ translated: 0, skipped: 1, failed: 0 });
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should skip translations that already have values', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], ['es'], 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [
            { language: 'en', value: 'Hello' },
            { language: 'es', value: 'Hola' }, // Already has translation
          ],
        },
      ]);

      const result = await handler.execute(command);

      expect(result).toEqual({ translated: 0, skipped: 1, failed: 0 });
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should use MT query when provider is MT', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], ['es'], 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({
        translatedText: 'Hola',
      });

      await handler.execute(command);

      // Should call queryBus.execute with TranslateWithContextQuery
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      const queryArg = mockQueryBus.execute.mock.calls[0][0];
      expect(queryArg.projectId).toBe('project-1');
      expect(queryArg.userId).toBe('user-1');
      expect(queryArg.input.branchId).toBe('branch-1');
      expect(queryArg.input.keyId).toBe('key-1');
      expect(queryArg.input.text).toBe('Hello');
      expect(queryArg.input.sourceLanguage).toBe('en');
      expect(queryArg.input.targetLanguage).toBe('es');
    });

    it('should use AI query when provider is AI', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], ['es'], 'AI', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({
        text: 'Hola',
      });

      await handler.execute(command);

      // Should call queryBus.execute with TranslateQuery (AI)
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      const queryArg = mockQueryBus.execute.mock.calls[0][0];
      expect(queryArg.projectId).toBe('project-1');
      expect(queryArg.userId).toBe('user-1');
    });

    it('should return failed count when translations fail', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], ['es', 'fr'], 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es', 'fr'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      // First call succeeds, second fails
      mockQueryBus.execute
        .mockResolvedValueOnce({ translatedText: 'Hola' })
        .mockRejectedValueOnce(new Error('Translation API error'));

      const result = await handler.execute(command);

      expect(result).toEqual({
        translated: 1,
        skipped: 0,
        failed: 1,
        errors: [{ keyId: 'key-1', language: 'fr', error: 'Translation API error' }],
      });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should return early when no target languages available', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], undefined, 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en'], // Only source language, no targets
      });

      const result = await handler.execute(command);

      expect(result).toEqual({ translated: 0, skipped: 0, failed: 0 });
      expect(mockRepository.getKeysWithTranslations).not.toHaveBeenCalled();
    });

    it('should filter out source language from target languages', async () => {
      const command = new BulkTranslateCommand(
        'branch-1',
        ['key-1'],
        ['en', 'es'], // Includes source language
        'MT',
        'user-1'
      );

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({
        translatedText: 'Hola',
      });

      await handler.execute(command);

      // Should only translate to es, not en
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      const queryArg = mockQueryBus.execute.mock.calls[0][0];
      expect(queryArg.input.targetLanguage).toBe('es');
    });

    it('should emit events for translated keys', async () => {
      const command = new BulkTranslateCommand('branch-1', ['key-1'], ['es'], 'MT', 'user-1');

      mockAccessService.verifyBranchAccess.mockResolvedValue({
        projectId: 'project-1',
        defaultLanguage: 'en',
        languages: ['en', 'es'],
      });

      mockRepository.getKeysWithTranslations.mockResolvedValue([
        {
          id: 'key-1',
          name: 'greeting',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({
        translatedText: 'Hola',
      });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });
});
