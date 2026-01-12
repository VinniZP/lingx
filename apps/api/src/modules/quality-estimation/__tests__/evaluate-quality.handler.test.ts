import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { EvaluateQualityCommand } from '../commands/evaluate-quality.command.js';
import { EvaluateQualityHandler } from '../commands/evaluate-quality.handler.js';
import { QualityEvaluatedEvent } from '../events/quality-evaluated.event.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';

describe('EvaluateQualityHandler', () => {
  const mockQualityService: { evaluate: ReturnType<typeof vi.fn> } = {
    evaluate: vi.fn(),
  };

  const mockAccessService: { verifyTranslationAccess: ReturnType<typeof vi.fn> } = {
    verifyTranslationAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new EvaluateQualityHandler(
      mockQualityService as unknown as QualityEstimationService,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should evaluate quality and emit event when user is authorized', async () => {
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
      needsAIEvaluation: false,
    };

    mockAccessService.verifyTranslationAccess.mockResolvedValue(undefined);
    mockQualityService.evaluate.mockResolvedValue(qualityScore);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new EvaluateQualityCommand('translation-1', 'user-1', { forceAI: false });

    const result = await handler.execute(command);

    expect(mockAccessService.verifyTranslationAccess).toHaveBeenCalledWith(
      'user-1',
      'translation-1'
    );
    expect(mockQualityService.evaluate).toHaveBeenCalledWith('translation-1', { forceAI: false });

    // Verify event was published with correct payload
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as QualityEvaluatedEvent;
    expect(publishedEvent).toBeInstanceOf(QualityEvaluatedEvent);
    expect(publishedEvent.translationId).toBe('translation-1');
    expect(publishedEvent.userId).toBe('user-1');
    expect(publishedEvent.score).toEqual(qualityScore);

    expect(result).toEqual(qualityScore);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyTranslationAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new EvaluateQualityCommand('translation-1', 'user-1', {});

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockQualityService.evaluate).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should pass forceAI option to service', async () => {
    const handler = createHandler();

    const qualityScore = {
      score: 92,
      issues: [],
      evaluationType: 'ai' as const,
      cached: false,
      needsAIEvaluation: false,
    };

    mockAccessService.verifyTranslationAccess.mockResolvedValue(undefined);
    mockQualityService.evaluate.mockResolvedValue(qualityScore);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new EvaluateQualityCommand('translation-1', 'user-1', { forceAI: true });

    await handler.execute(command);

    expect(mockQualityService.evaluate).toHaveBeenCalledWith('translation-1', { forceAI: true });
  });
});
