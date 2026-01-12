import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MTService } from '../../../services/mt.service.js';
import type { IEventBus, IQueryBus, ProgressReporter } from '../../../shared/cqrs/index.js';
import type { QualityEstimationService } from '../../quality-estimation/quality-estimation.service.js';
import { BulkTranslateSyncCommand } from '../commands/bulk-translate-sync.command.js';
import { BulkTranslateSyncHandler } from '../commands/bulk-translate-sync.handler.js';
import { KeyTranslationsUpdatedEvent } from '../events/translation-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

describe('BulkTranslateSyncHandler', () => {
  // Mock dependencies
  const mockRepository: {
    getKeysWithTranslations: ReturnType<typeof vi.fn>;
    setTranslation: ReturnType<typeof vi.fn>;
  } = {
    getKeysWithTranslations: vi.fn(),
    setTranslation: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const mockMtService: {
    translateWithContext: ReturnType<typeof vi.fn>;
  } = {
    translateWithContext: vi.fn(),
  };

  const mockQueryBus: {
    execute: ReturnType<typeof vi.fn>;
  } = {
    execute: vi.fn(),
  };

  const mockQualityService: {
    getConfig: ReturnType<typeof vi.fn>;
    evaluate: ReturnType<typeof vi.fn>;
  } = {
    getConfig: vi.fn(),
    evaluate: vi.fn(),
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

  let handler: BulkTranslateSyncHandler;

  const createHandler = (qualityEstimationService?: QualityEstimationService) =>
    new BulkTranslateSyncHandler(
      mockRepository as unknown as TranslationRepository,
      mockEventBus as unknown as IEventBus,
      mockMtService as unknown as MTService,
      mockQueryBus as unknown as IQueryBus,
      qualityEstimationService,
      mockLogger as unknown as FastifyBaseLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createHandler(mockQualityService as unknown as QualityEstimationService);
  });

  describe('MT translations', () => {
    it('should translate keys using MT service', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es', 'fr'],
        'en',
        'MT',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockMtService.translateWithContext.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockMtService.translateWithContext).toHaveBeenCalledTimes(2);
      expect(mockMtService.translateWithContext).toHaveBeenCalledWith(
        'project-1',
        'branch-1',
        'key-1',
        'Hello',
        'en',
        'es'
      );
    });

    it('should skip keys without source translation', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'MT',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [], // No source translation
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);

      const result = await handler.execute(command);

      expect(result.translated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockMtService.translateWithContext).not.toHaveBeenCalled();
    });

    it('should skip languages that already have translations', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es', 'fr'],
        'en',
        'MT',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [
          { language: 'en', value: 'Hello' },
          { language: 'es', value: 'Hola' }, // Already exists
        ],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockMtService.translateWithContext.mockResolvedValue({ translatedText: 'Bonjour' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(1); // Only fr
      expect(result.skipped).toBe(1); // es skipped
      expect(mockMtService.translateWithContext).toHaveBeenCalledTimes(1);
      expect(mockMtService.translateWithContext).toHaveBeenCalledWith(
        'project-1',
        'branch-1',
        'key-1',
        'Hello',
        'en',
        'fr'
      );
    });
  });

  describe('AI translations', () => {
    it('should translate keys using AI via queryBus', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'AI',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockQueryBus.execute.mockResolvedValue({ text: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });
      mockQualityService.getConfig.mockResolvedValue({ scoreAfterAITranslation: false });

      const result = await handler.execute(command);

      expect(result.translated).toBe(1);
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });

    it('should trigger quality evaluation after AI translation if configured', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'AI',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockQueryBus.execute.mockResolvedValue({ text: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });
      mockQualityService.getConfig.mockResolvedValue({ scoreAfterAITranslation: true });
      mockQualityService.evaluate.mockResolvedValue(undefined);

      await handler.execute(command);

      expect(mockQualityService.getConfig).toHaveBeenCalledWith('project-1');
      expect(mockQualityService.evaluate).toHaveBeenCalledWith('translation-1');
    });
  });

  describe('error handling', () => {
    it('should continue processing after translation errors', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1', 'key-2'],
        ['es'],
        'en',
        'MT',
        'user-1'
      );

      const mockKeys = [
        { id: 'key-1', name: 'common.hello', translations: [{ language: 'en', value: 'Hello' }] },
        { id: 'key-2', name: 'common.bye', translations: [{ language: 'en', value: 'Goodbye' }] },
      ];

      mockRepository.getKeysWithTranslations.mockResolvedValue(mockKeys);
      mockMtService.translateWithContext
        .mockRejectedValueOnce(new Error('MT Error'))
        .mockResolvedValueOnce({ translatedText: 'Adiós' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handler.execute(command);

      expect(result.translated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toEqual({
        keyId: 'key-1',
        keyName: 'common.hello',
        language: 'es',
        error: 'MT Error',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle quality evaluation errors gracefully', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'AI',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockQueryBus.execute.mockResolvedValue({ text: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });
      mockQualityService.getConfig.mockRejectedValue(new Error('Config error'));

      const result = await handler.execute(command);

      // Translation should still succeed
      expect(result.translated).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit KeyTranslationsUpdatedEvent for each translated key', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es', 'fr'],
        'en',
        'MT',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockMtService.translateWithContext.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(KeyTranslationsUpdatedEvent));
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as KeyTranslationsUpdatedEvent;
      expect(publishedEvent.keyId).toBe('key-1');
      expect(publishedEvent.keyName).toBe('common.hello');
      expect(publishedEvent.changedLanguages).toEqual(['es', 'fr']);
      expect(publishedEvent.userId).toBe('user-1');
      expect(publishedEvent.projectId).toBe('project-1');
      expect(publishedEvent.branchId).toBe('branch-1');
    });

    it('should not emit event for keys with no successful translations', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'MT',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockMtService.translateWithContext.mockRejectedValue(new Error('MT Error'));

      await handler.execute(command);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('progress reporting', () => {
    it('should report progress when progressReporter is provided', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es', 'fr'],
        'en',
        'MT',
        'user-1',
        mockProgressReporter
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockMtService.translateWithContext.mockResolvedValue({ translatedText: 'Translated' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      await handler.execute(command);

      // Should report progress for each translation
      expect(mockProgressReporter.updateProgress).toHaveBeenCalled();
      const lastCall = (mockProgressReporter.updateProgress as ReturnType<typeof vi.fn>).mock
        .calls[1][0];
      expect(lastCall.total).toBe(2);
      expect(lastCall.processed).toBe(2);
      expect(lastCall.translated).toBe(2);
    });

    it('should work without progressReporter', async () => {
      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'MT',
        'user-1'
        // No progressReporter
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockMtService.translateWithContext.mockResolvedValue({ translatedText: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      // Should not throw
      const result = await handler.execute(command);
      expect(result.translated).toBe(1);
    });
  });

  describe('without quality service', () => {
    it('should work when quality service is undefined', async () => {
      const handlerWithoutQuality = createHandler(undefined);

      const command = new BulkTranslateSyncCommand(
        'project-1',
        'branch-1',
        ['key-1'],
        ['es'],
        'en',
        'AI',
        'user-1'
      );

      const mockKey = {
        id: 'key-1',
        name: 'common.hello',
        translations: [{ language: 'en', value: 'Hello' }],
      };

      mockRepository.getKeysWithTranslations.mockResolvedValue([mockKey]);
      mockQueryBus.execute.mockResolvedValue({ text: 'Hola' });
      mockRepository.setTranslation.mockResolvedValue({ id: 'translation-1' });

      const result = await handlerWithoutQuality.execute(command);

      expect(result.translated).toBe(1);
      expect(mockQualityService.getConfig).not.toHaveBeenCalled();
    });
  });
});
