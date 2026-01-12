import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus, IQueryBus, ProgressReporter } from '../../../shared/cqrs/index.js';
import { PreTranslateCommand } from '../commands/pre-translate.command.js';
import { PreTranslateHandler } from '../commands/pre-translate.handler.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('PreTranslateHandler', () => {
  const mockRepository: {
    setTranslation: ReturnType<typeof vi.fn>;
    getProjectSourceLanguage: ReturnType<typeof vi.fn>;
    getKeysByBranchId: ReturnType<typeof vi.fn>;
  } = {
    setTranslation: vi.fn(),
    getProjectSourceLanguage: vi.fn(),
    getKeysByBranchId: vi.fn(),
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
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  } = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };

  const mockProgressReporter: ProgressReporter = {
    updateProgress: vi.fn(),
  };

  let handler: PreTranslateHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new PreTranslateHandler(
      mockRepository as unknown as TranslationRepository,
      mockQueryBus as unknown as IQueryBus,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('successful pre-translation', () => {
    it('should pre-translate missing translations for all keys in branch', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es', 'fr'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(2); // 1 key × 2 languages
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(2);
    });

    it('should only translate empty translations', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es', 'fr'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [
            { language: 'en', value: 'Hello' },
            { language: 'es', value: 'Hola' }, // Already has Spanish
          ],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Bonjour' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(1); // Only French
      expect(result.skipped).toBe(1); // Spanish skipped
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
      // Verify query was called with correct target language
      const queryArg = mockQueryBus.execute.mock.calls[0][0];
      expect(queryArg.input.targetLanguage).toBe('fr');
    });
  });

  describe('skipping translations', () => {
    it('should skip keys without source translation', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [], // No source translation
        },
      ]);

      const result = await handler.execute(command);

      expect(result.translated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should return early when no target languages provided', async () => {
      const command = new PreTranslateCommand(
        'project-1',
        'branch-1',
        [], // Empty target languages
        'user-1'
      );

      const result = await handler.execute(command);

      expect(result.translated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockRepository.getProjectSourceLanguage).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw when project not found', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow('Project project-1 not found');
    });

    it('should continue after translation errors', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [{ language: 'en', value: 'Hello' }],
        },
        {
          id: 'key-2',
          name: 'common.bye',
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
    it('should emit KeyTranslationsUpdatedEvent with all translated languages for each key', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es', 'fr'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1); // One event per key
      const event = mockEventBus.publish.mock.calls[0][0] as KeyTranslationsUpdatedEvent;
      expect(event.keyId).toBe('key-1');
      expect(event.changedLanguages).toEqual(['es', 'fr']);
      expect(event.branchId).toBe('branch-1');
    });

    it('should not emit event for keys with no successful translations', async () => {
      const command = new PreTranslateCommand('project-1', 'branch-1', ['es'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [{ language: 'en', value: 'Hello' }],
        },
      ]);

      mockQueryBus.execute.mockRejectedValue(new Error('MT Error'));

      await handler.execute(command);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('progress reporting', () => {
    it('should report progress when progressReporter is provided', async () => {
      const command = new PreTranslateCommand(
        'project-1',
        'branch-1',
        ['es'],
        'user-1',
        undefined,
        mockProgressReporter
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
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
  });

  describe('batch processing with many keys', () => {
    it('should process 15+ keys across multiple languages', async () => {
      // Create 15 keys to test batching (BATCH_SIZE = 10)
      const keys = Array.from({ length: 15 }, (_, i) => ({
        id: `key-${i}`,
        name: `common.key_${i}`,
        translations: [{ language: 'en', value: `Hello ${i}` }],
      }));

      const command = new PreTranslateCommand('project-1', 'branch-1', ['es', 'fr'], 'user-1');

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');
      mockRepository.getKeysByBranchId.mockResolvedValue(keys);
      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      // 15 keys × 2 languages = 30 translations
      expect(result.translated).toBe(30);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(30);
    });
  });

  describe('multi-key event aggregation', () => {
    it('should emit one event per key with all translated languages', async () => {
      const command = new PreTranslateCommand(
        'project-1',
        'branch-1',
        ['es', 'fr', 'de'],
        'user-1'
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
          translations: [{ language: 'en', value: 'Hello' }],
        },
        {
          id: 'key-2',
          name: 'common.bye',
          translations: [{ language: 'en', value: 'Goodbye' }],
        },
      ]);

      mockQueryBus.execute.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      // Should emit 2 events (one per key), each with 3 languages
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);

      const events = mockEventBus.publish.mock.calls.map(
        (call) => call[0] as KeyTranslationsUpdatedEvent
      );

      // First key event
      const key1Event = events.find((e) => e.keyId === 'key-1');
      expect(key1Event).toBeDefined();
      expect(key1Event?.changedLanguages).toEqual(expect.arrayContaining(['es', 'fr', 'de']));
      expect(key1Event?.changedLanguages).toHaveLength(3);

      // Second key event
      const key2Event = events.find((e) => e.keyId === 'key-2');
      expect(key2Event).toBeDefined();
      expect(key2Event?.changedLanguages).toEqual(expect.arrayContaining(['es', 'fr', 'de']));
      expect(key2Event?.changedLanguages).toHaveLength(3);
    });
  });

  describe('provider parameter', () => {
    it('should pass provider to TranslateTextQuery', async () => {
      const command = new PreTranslateCommand(
        'project-1',
        'branch-1',
        ['es'],
        'user-1',
        'DEEPL' // Specify provider
      );

      mockRepository.getProjectSourceLanguage.mockResolvedValue('en');

      mockRepository.getKeysByBranchId.mockResolvedValue([
        {
          id: 'key-1',
          name: 'common.hello',
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
});
