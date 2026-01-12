import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus, IQueryBus, ProgressReporter } from '../../../shared/cqrs/index.js';
import { BatchTranslateKeysCommand } from '../commands/batch-translate-keys.command.js';
import { BatchTranslateKeysHandler } from '../commands/batch-translate-keys.handler.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('BatchTranslateKeysHandler', () => {
  const mockRepository: {
    setTranslation: ReturnType<typeof vi.fn>;
    getProjectSourceLanguage: ReturnType<typeof vi.fn>;
    getKeysByIds: ReturnType<typeof vi.fn>;
  } = {
    setTranslation: vi.fn(),
    getProjectSourceLanguage: vi.fn(),
    getKeysByIds: vi.fn(),
  };

  const mockQueryBus: {
    execute: ReturnType<typeof vi.fn>;
  } = {
    execute: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const mockLogger: {
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  } = {
    error: vi.fn(),
    info: vi.fn(),
  };

  const mockProgressReporter: ProgressReporter = {
    updateProgress: vi.fn(),
  };

  let handler: BatchTranslateKeysHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BatchTranslateKeysHandler(
      mockRepository as unknown as TranslationRepository,
      mockQueryBus as unknown as IQueryBus,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('successful translations', () => {
    it('should translate keys to target language', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1', 'key-2'],
        'es',
        'user-1'
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Hello' }],
        },
        {
          id: 'key-2',
          name: 'common.bye',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Goodbye' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(2);
      expect(mockRepository.setTranslation).toHaveBeenCalledTimes(2);
    });

    it('should use specified provider', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1'],
        'es',
        'user-1',
        'DEEPL' // Specify provider
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      const queryArg = mockQueryBus.execute.mock.calls[0][0];
      expect(queryArg.input.provider).toBe('DEEPL');
      expect(queryArg.input.targetLanguage).toBe('es');
    });
  });

  describe('skipping translations', () => {
    it('should skip keys without source translation', async () => {
      const command = new BatchTranslateKeysCommand('project-1', ['key-1'], 'es', 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [], // No source
        },
      ]);

      const result = await handler.execute(command);

      expect(result.translated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should skip existing translations when overwriteExisting is false', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1'],
        'es',
        'user-1',
        undefined,
        false // Don't overwrite
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [
            { language: 'en', value: 'Hello' },
            { language: 'es', value: 'Hola' }, // Already exists
          ],
        },
      ]);

      const result = await handler.execute(command);

      expect(result.translated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should overwrite existing translations when overwriteExisting is true', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1'],
        'es',
        'user-1',
        undefined,
        true // Overwrite
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [
            { language: 'en', value: 'Hello' },
            { language: 'es', value: 'Hola' },
          ],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Hola nuevo' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw when project not found', async () => {
      const command = new BatchTranslateKeysCommand('project-1', ['key-1'], 'es', 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Project project-1 not found');
    });

    it('should continue after translation errors', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1', 'key-2'],
        'es',
        'user-1'
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Hello' }],
        },
        {
          id: 'key-2',
          name: 'common.bye',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Goodbye' }],
        },
      ]);

      mockQueryBus.execute
        .mockRejectedValueOnce(new Error('MT Error'))
        .mockResolvedValueOnce({ translatedText: 'Adiós' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit KeyTranslationsUpdatedEvent for each translated key', async () => {
      const command = new BatchTranslateKeysCommand('project-1', ['key-1'], 'es', 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeyTranslationsUpdatedEvent));
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as KeyTranslationsUpdatedEvent;
      expect(publishedEvent.keyId).toBe('key-1');
      expect(publishedEvent.changedLanguages).toEqual(['es']);
      expect(publishedEvent.userId).toBe('user-1');
    });
  });

  describe('progress reporting', () => {
    it('should report progress when progressReporter is provided', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1'],
        'es',
        'user-1',
        undefined,
        undefined,
        mockProgressReporter
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      expect(mockProgressReporter.updateProgress).toHaveBeenCalledWith({
        processed: 1,
        total: 1,
        translated: 1,
        skipped: 0,
        failed: 0,
      });
    });

    it('should work without progressReporter', async () => {
      const command = new BatchTranslateKeysCommand(
        'project-1',
        ['key-1'],
        'es',
        'user-1'
        // No progressReporter
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByIds.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          branchId: 'branch-1',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      // Should not throw
      const result = await handler.execute(command);
      expect(result.translated).toBe(1);
    });
  });

  describe('batch processing with many keys', () => {
    it('should process 15+ keys in batches', async () => {
      // Create 15 keys to test batching (BATCH_SIZE = 10)
      const keys = Array.from({ length: 15 }, (_, i) => ({
        id: `key-${i}`,
        name: `common.key_${i}`,
        branchId: 'branch-1',
        translations: [{ language: 'en', value: `Hello ${i}` }],
      }));

      const command = new BatchTranslateKeysCommand(
        'project-1',
        keys.map((k) => k.id),
        'es',
        'user-1'
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');
      mockRepository.getKeysByIds.mockResolvedValue(keys);
      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(15);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(15);
      expect(mockRepository.setTranslation).toHaveBeenCalledTimes(15);
    });
  });
});
