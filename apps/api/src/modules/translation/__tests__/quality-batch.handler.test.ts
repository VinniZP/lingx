import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus, ProgressReporter } from '../../../shared/cqrs/index.js';
import type { QualityEstimationService } from '../../quality-estimation/quality-estimation.service.js';
import { QualityBatchCommand } from '../commands/quality-batch.command.js';
import { QualityBatchHandler } from '../commands/quality-batch.handler.js';
import { QualityScoresUpdatedEvent } from '../events/quality-scores-updated.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';

// Mock @lingx/shared quality functions
vi.mock('@lingx/shared', () => ({
  calculateScore: vi.fn(),
  runQualityChecks: vi.fn(),
}));

import { calculateScore, runQualityChecks } from '@lingx/shared';

describe('QualityBatchHandler', () => {
  // Mock repository
  const mockTranslationRepository: {
    findTranslationsForQualityBatch: ReturnType<typeof vi.fn>;
    findSourceTranslations: ReturnType<typeof vi.fn>;
  } = {
    findTranslationsForQualityBatch: vi.fn(),
    findSourceTranslations: vi.fn(),
  };

  // Mock quality service
  const mockQualityEstimationService: {
    evaluate: ReturnType<typeof vi.fn>;
    evaluateKeyAllLanguages: ReturnType<typeof vi.fn>;
  } = {
    evaluate: vi.fn(),
    evaluateKeyAllLanguages: vi.fn(),
  };

  // Mock event bus
  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  // Mock logger
  const mockLogger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  } = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  // Mock progress reporter
  const mockProgressReporter: ProgressReporter = {
    updateProgress: vi.fn(),
  };

  let handler: QualityBatchHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
    (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 90, issues: [] });

    // Reset quality service mocks to successful state
    mockQualityEstimationService.evaluate.mockResolvedValue(undefined);
    mockQualityEstimationService.evaluateKeyAllLanguages.mockResolvedValue(undefined);

    handler = new QualityBatchHandler(
      mockTranslationRepository as unknown as TranslationRepository,
      mockQualityEstimationService as unknown as QualityEstimationService,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('empty input handling', () => {
    it('should return early when translationIds is empty', async () => {
      const command = new QualityBatchCommand([], 'project-1', 'branch-1');

      await handler.execute(command);

      expect(mockTranslationRepository.findTranslationsForQualityBatch).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { branchId: 'branch-1' },
        'Quality batch: no translation IDs provided'
      );
    });

    it('should return early when no translations found', async () => {
      const command = new QualityBatchCommand(['t-1', 't-2'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [],
        sourceLanguage: 'en',
      });

      await handler.execute(command);

      expect(mockQualityEstimationService.evaluate).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { branchId: 'branch-1' },
        'No translations found for quality batch'
      );
    });
  });

  describe('heuristic-only evaluation', () => {
    it('should skip AI when all heuristics pass (score >= 80)', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          {
            id: 't-1',
            keyId: 'key-1',
            language: 'es',
            value: 'Hola',
            key: { name: 'greeting' },
          },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      // Heuristics pass with good score
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      await handler.execute(command);

      // Should call evaluate (heuristic-only) but not evaluateKeyAllLanguages (AI)
      expect(mockQualityEstimationService.evaluate).toHaveBeenCalledWith('t-1', { forceAI: false });
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).not.toHaveBeenCalled();
    });

    it('should trigger AI when heuristic score is low (< 80)', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          {
            id: 't-1',
            keyId: 'key-1',
            language: 'es',
            value: 'Hola',
            key: { name: 'greeting' },
          },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      // Low heuristic score triggers AI
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 70, issues: [] });

      await handler.execute(command);

      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalled();
    });

    it('should trigger AI when heuristics have error-severity issues', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          {
            id: 't-1',
            keyId: 'key-1',
            language: 'es',
            value: 'Hola {name}',
            key: { name: 'greeting' },
          },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello {firstName}']])
      );

      // High score but has error-level issue
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({
        score: 85,
        issues: [
          { type: 'placeholder_mismatch', severity: 'error', message: 'Missing placeholder' },
        ],
      });

      await handler.execute(command);

      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalled();
    });
  });

  describe('forceAI option', () => {
    it('should always use AI when forceAI is true', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1', true);

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          {
            id: 't-1',
            keyId: 'key-1',
            language: 'es',
            value: 'Hola',
            key: { name: 'greeting' },
          },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      // Perfect heuristic score
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 100, issues: [] });

      await handler.execute(command);

      // Should still call AI because forceAI is true
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalled();
    });
  });

  describe('format-only evaluation (no source)', () => {
    it('should use format-only evaluation when source translation is missing', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          {
            id: 't-1',
            keyId: 'key-1',
            language: 'es',
            value: 'Hola',
            key: { name: 'greeting' },
          },
        ],
        sourceLanguage: 'en',
      });

      // No source translation for this key
      mockTranslationRepository.findSourceTranslations.mockResolvedValue(new Map());

      await handler.execute(command);

      // Should call evaluate with forceAI option (format-only path)
      expect(mockQualityEstimationService.evaluate).toHaveBeenCalledWith('t-1', { forceAI: false });
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { keyName: 'greeting' },
        'No source, using format-only evaluation'
      );
    });
  });

  describe('multi-language grouping', () => {
    it('should group translations by key for efficient AI calls', async () => {
      const command = new QualityBatchCommand(['t-1', 't-2', 't-3'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
          {
            id: 't-2',
            keyId: 'key-1',
            language: 'fr',
            value: 'Bonjour',
            key: { name: 'greeting' },
          },
          { id: 't-3', keyId: 'key-1', language: 'de', value: 'Hallo', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      // Low score to trigger AI
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 70, issues: [] });

      await handler.execute(command);

      // Should make only ONE AI call with all 3 languages
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalledTimes(1);
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalledWith(
        'key-1',
        'greeting',
        expect.arrayContaining([
          { id: 't-1', language: 'es', value: 'Hola' },
          { id: 't-2', language: 'fr', value: 'Bonjour' },
          { id: 't-3', language: 'de', value: 'Hallo' },
        ]),
        'Hello',
        'en',
        'project-1',
        expect.any(Map)
      );
    });

    it('should process multiple keys independently', async () => {
      const command = new QualityBatchCommand(['t-1', 't-2'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
          { id: 't-2', keyId: 'key-2', language: 'es', value: 'Adiós', key: { name: 'farewell' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([
          ['key-1', 'Hello'],
          ['key-2', 'Goodbye'],
        ])
      );

      // Low score to trigger AI for both
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 70, issues: [] });

      await handler.execute(command);

      // Should make 2 AI calls (one per key)
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalledTimes(2);
    });
  });

  describe('progress reporting', () => {
    it('should report progress when progressReporter is provided', async () => {
      const command = new QualityBatchCommand(
        ['t-1', 't-2'],
        'project-1',
        'branch-1',
        false,
        mockProgressReporter
      );

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
          { id: 't-2', keyId: 'key-2', language: 'es', value: 'Adiós', key: { name: 'farewell' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([
          ['key-1', 'Hello'],
          ['key-2', 'Goodbye'],
        ])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      await handler.execute(command);

      expect(mockProgressReporter.updateProgress).toHaveBeenCalled();
      const calls = (mockProgressReporter.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[0]).toEqual({
        processed: 2,
        total: 2,
      });
    });

    it('should work without progressReporter', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      // Should not throw
      await expect(handler.execute(command)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should continue processing other keys when one fails', async () => {
      const command = new QualityBatchCommand(['t-1', 't-2'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
          { id: 't-2', keyId: 'key-2', language: 'es', value: 'Adiós', key: { name: 'farewell' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([
          ['key-1', 'Hello'],
          ['key-2', 'Goodbye'],
        ])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      // First key succeeds, second fails
      mockQualityEstimationService.evaluate
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('AI service unavailable'));

      await handler.execute(command);

      // Both should be attempted
      expect(mockQualityEstimationService.evaluate).toHaveBeenCalledTimes(2);
      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log failure summary when there are errors', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      mockQualityEstimationService.evaluate.mockRejectedValue(new Error('Service error'));

      await handler.execute(command);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          perTranslationFailures: 1,
        }),
        'Quality evaluation failures summary'
      );
    });
  });

  describe('concurrency', () => {
    it('should process keys with limited concurrency', async () => {
      // Create 10 translations across 10 keys
      const translations = Array.from({ length: 10 }, (_, i) => ({
        id: `t-${i}`,
        keyId: `key-${i}`,
        language: 'es',
        value: `Value ${i}`,
        key: { name: `key_${i}` },
      }));

      const command = new QualityBatchCommand(
        translations.map((t) => t.id),
        'project-1',
        'branch-1'
      );

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations,
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map(translations.map((t) => [t.keyId, `Source ${t.keyId}`]))
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      await handler.execute(command);

      // All 10 should be processed
      expect(mockQualityEstimationService.evaluate).toHaveBeenCalledTimes(10);
    });
  });

  describe('result type', () => {
    it('should return result with processed, succeeded, and failed counts', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      const result = await handler.execute(command);

      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: undefined,
      });
    });

    it('should return errors array when translations fail', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      mockQualityEstimationService.evaluate.mockRejectedValue(new Error('Service error'));

      const result = await handler.execute(command);

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toMatchObject({
        keyName: 'greeting',
        error: 'Service error',
      });
    });
  });

  describe('event emission', () => {
    it('should emit QualityScoresUpdatedEvent for successfully evaluated keys', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 95, issues: [] });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(QualityScoresUpdatedEvent));
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as QualityScoresUpdatedEvent;
      expect(publishedEvent.keyId).toBe('key-1');
      expect(publishedEvent.keyName).toBe('greeting');
      expect(publishedEvent.languages).toEqual(['es']);
      expect(publishedEvent.projectId).toBe('project-1');
      expect(publishedEvent.branchId).toBe('branch-1');
    });

    it('should not emit event for keys with failed evaluations', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 70, issues: [] });

      // AI evaluation fails
      mockQualityEstimationService.evaluateKeyAllLanguages.mockRejectedValue(new Error('AI Error'));

      await handler.execute(command);

      // No event should be emitted since evaluation failed
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('warning severity handling', () => {
    it('should NOT trigger AI when only warning-severity issues exist (score >= 80)', async () => {
      const command = new QualityBatchCommand(['t-1'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([['key-1', 'Hello']])
      );

      // High score with only warning-level issue (not error)
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({
        score: 85,
        issues: [{ type: 'length_mismatch', severity: 'warning', message: 'Length differs' }],
      });

      await handler.execute(command);

      // Should use heuristic-only evaluation (no AI)
      expect(mockQualityEstimationService.evaluate).toHaveBeenCalledWith('t-1', { forceAI: false });
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).not.toHaveBeenCalled();
    });
  });

  describe('evaluateKeyAllLanguages rejection handling', () => {
    it('should continue processing other keys when evaluateKeyAllLanguages rejects', async () => {
      const command = new QualityBatchCommand(['t-1', 't-2'], 'project-1', 'branch-1');

      mockTranslationRepository.findTranslationsForQualityBatch.mockResolvedValue({
        translations: [
          { id: 't-1', keyId: 'key-1', language: 'es', value: 'Hola', key: { name: 'greeting' } },
          { id: 't-2', keyId: 'key-2', language: 'es', value: 'Adiós', key: { name: 'farewell' } },
        ],
        sourceLanguage: 'en',
      });

      mockTranslationRepository.findSourceTranslations.mockResolvedValue(
        new Map([
          ['key-1', 'Hello'],
          ['key-2', 'Goodbye'],
        ])
      );

      // Low score to trigger AI for both
      (runQualityChecks as ReturnType<typeof vi.fn>).mockReturnValue({ issues: [] });
      (calculateScore as ReturnType<typeof vi.fn>).mockReturnValue({ score: 70, issues: [] });

      // First key fails AI, second succeeds
      mockQualityEstimationService.evaluateKeyAllLanguages
        .mockRejectedValueOnce(new Error('AI service error'))
        .mockResolvedValueOnce(undefined);

      const result = await handler.execute(command);

      // Both should be attempted
      expect(mockQualityEstimationService.evaluateKeyAllLanguages).toHaveBeenCalledTimes(2);
      // One failed, one succeeded
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(1);
      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          keyName: 'greeting',
          error: 'AI service error',
        }),
        'Quality evaluation failed for key'
      );
      // Only one event should be emitted (for the successful key)
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });
});
