import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchEvaluationQueuedEvent } from '../events/batch-evaluation-queued.event.js';
import { QualityConfigUpdatedEvent } from '../events/quality-config-updated.event.js';
import { QualityEvaluatedEvent } from '../events/quality-evaluated.event.js';
import { QualityActivityHandler } from '../handlers/quality-activity.handler.js';

describe('QualityActivityHandler', () => {
  const mockLogger: { info: ReturnType<typeof vi.fn> } = {
    info: vi.fn(),
  };

  const createHandler = () =>
    new QualityActivityHandler(mockLogger as unknown as FastifyBaseLogger);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QualityEvaluatedEvent handling', () => {
    it('should log quality evaluation with correct metadata', async () => {
      const handler = createHandler();

      const qualityScore = {
        score: 85,
        accuracy: 90,
        fluency: 80,
        terminology: 85,
        format: 90,
        issues: [],
        evaluationType: 'ai' as const,
        cached: false,
        passed: true,
        needsAIEvaluation: false,
      };

      const event = new QualityEvaluatedEvent('translation-123', qualityScore, 'user-456');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality_evaluated',
          translationId: 'translation-123',
          score: 85,
          evaluationType: 'ai',
          userId: 'user-456',
        }),
        '[Quality Activity] Translation evaluated'
      );
    });

    it('should log heuristic evaluation type', async () => {
      const handler = createHandler();

      const qualityScore = {
        score: 92,
        format: 92,
        issues: [],
        evaluationType: 'heuristic' as const,
        cached: false,
        passed: true,
        needsAIEvaluation: false,
      };

      const event = new QualityEvaluatedEvent('translation-789', qualityScore, 'user-101');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality_evaluated',
          translationId: 'translation-789',
          score: 92,
          evaluationType: 'heuristic',
          userId: 'user-101',
        }),
        '[Quality Activity] Translation evaluated'
      );
    });
  });

  describe('BatchEvaluationQueuedEvent handling', () => {
    it('should log batch evaluation with job stats', async () => {
      const handler = createHandler();

      const stats = {
        total: 100,
        cached: 30,
        queued: 70,
      };

      const event = new BatchEvaluationQueuedEvent('branch-123', 'job-456', stats, 'user-789');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch_evaluation_queued',
          branchId: 'branch-123',
          jobId: 'job-456',
          stats: { total: 100, cached: 30, queued: 70 },
          userId: 'user-789',
        }),
        '[Quality Activity] Batch evaluation queued'
      );
    });
  });

  describe('QualityConfigUpdatedEvent handling', () => {
    it('should log config update with AI enabled', async () => {
      const handler = createHandler();

      const config = {
        aiEvaluationEnabled: true,
        aiEvaluationProvider: 'OPENAI' as const,
        aiEvaluationModel: 'gpt-4o-mini',
        scoreAfterAITranslation: true,
        scoreBeforeMerge: false,
        autoApproveThreshold: 80,
        flagThreshold: 50,
      };

      const event = new QualityConfigUpdatedEvent('project-123', config, 'user-456');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality_config_updated',
          projectId: 'project-123',
          aiEnabled: true,
          userId: 'user-456',
        }),
        '[Quality Activity] Quality config updated'
      );
    });

    it('should log config update with AI disabled', async () => {
      const handler = createHandler();

      const config = {
        aiEvaluationEnabled: false,
        aiEvaluationProvider: null,
        aiEvaluationModel: null,
        scoreAfterAITranslation: false,
        scoreBeforeMerge: false,
        autoApproveThreshold: 80,
        flagThreshold: 50,
      };

      const event = new QualityConfigUpdatedEvent('project-789', config, 'user-101');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality_config_updated',
          projectId: 'project-789',
          aiEnabled: false,
          userId: 'user-101',
        }),
        '[Quality Activity] Quality config updated'
      );
    });
  });
});
