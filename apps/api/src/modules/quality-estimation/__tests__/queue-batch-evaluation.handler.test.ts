import { MAX_BATCH_TRANSLATION_IDS } from '@lingx/shared';
import type { Job, Queue } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { QueueBatchEvaluationCommand } from '../commands/queue-batch-evaluation.command.js';
import { QueueBatchEvaluationHandler } from '../commands/queue-batch-evaluation.handler.js';
import { BatchEvaluationQueuedEvent } from '../events/batch-evaluation-queued.event.js';
import { generateContentHash } from '../quality/index.js';
import type { QualityEstimationRepository } from '../repositories/quality-estimation.repository.js';

describe('QueueBatchEvaluationHandler', () => {
  const mockRepository: {
    findTranslationsForBatchEvaluation: ReturnType<typeof vi.fn>;
    findSourceTranslationsForKeys: ReturnType<typeof vi.fn>;
  } = {
    findTranslationsForBatchEvaluation: vi.fn(),
    findSourceTranslationsForKeys: vi.fn(),
  };

  const mockQueue: { add: ReturnType<typeof vi.fn> } = {
    add: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const mockLogger: FastifyBaseLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as FastifyBaseLogger;

  const createHandler = () =>
    new QueueBatchEvaluationHandler(
      mockRepository as unknown as QualityEstimationRepository,
      mockQueue as unknown as Queue,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus,
      mockLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue batch evaluation and emit event when user is authorized', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de', 'fr'],
    };

    // Source text for cache hash calculation
    const sourceValue = 'Hello World';
    const translationValue = 'Hallo Welt';

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([
      {
        id: 'trans-1',
        keyId: 'key-1',
        language: 'de',
        value: translationValue,
        qualityScore: null, // No cache
      },
      {
        id: 'trans-2',
        keyId: 'key-1',
        language: 'fr',
        value: 'Bonjour le monde',
        qualityScore: null, // No cache
      },
    ]);
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(
      new Map([['key-1', sourceValue]])
    );
    mockQueue.add.mockResolvedValue({ id: 'job-123' } as Job);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    const result = await handler.execute(command);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockRepository.findTranslationsForBatchEvaluation).toHaveBeenCalledWith(
      'branch-1',
      ['en', 'de', 'fr'],
      undefined
    );
    expect(mockRepository.findSourceTranslationsForKeys).toHaveBeenCalledWith(['key-1'], 'en');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'quality-batch',
      expect.objectContaining({
        type: 'quality-batch',
        projectId: 'project-1',
        userId: 'user-1',
        branchId: 'branch-1',
        translationIds: ['trans-1', 'trans-2'],
        forceAI: false,
      })
    );

    // Verify event was published with correct payload
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as BatchEvaluationQueuedEvent;
    expect(publishedEvent).toBeInstanceOf(BatchEvaluationQueuedEvent);
    expect(publishedEvent.branchId).toBe('branch-1');
    expect(publishedEvent.jobId).toBe('job-123');
    expect(publishedEvent.stats).toEqual({ total: 2, cached: 0, queued: 2 });
    expect(publishedEvent.userId).toBe('user-1');

    expect(result).toEqual({
      jobId: 'job-123',
      stats: { total: 2, cached: 0, queued: 2 },
    });
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockRepository.findTranslationsForBatchEvaluation).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should pass translationIds and forceAI options', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([
      {
        id: 'trans-1',
        keyId: 'key-1',
        language: 'de',
        value: 'Hallo',
        qualityScore: null,
      },
    ]);
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(new Map([['key-1', 'Hello']]));
    mockQueue.add.mockResolvedValue({ id: 'job-456' } as Job);
    mockEventBus.publish.mockResolvedValue(undefined);

    const translationIds = ['trans-1', 'trans-2', 'trans-3'];
    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {
      translationIds,
      forceAI: true,
    });

    await handler.execute(command);

    expect(mockRepository.findTranslationsForBatchEvaluation).toHaveBeenCalledWith(
      'branch-1',
      ['en', 'de'],
      translationIds
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      'quality-batch',
      expect.objectContaining({
        forceAI: true,
      })
    );
  });

  it('should throw ValidationError when batch size exceeds maximum', async () => {
    const handler = createHandler();

    // Create array with more than MAX_BATCH_TRANSLATION_IDS
    const oversizedBatch = Array.from({ length: MAX_BATCH_TRANSLATION_IDS + 1 }, (_, i) => `t${i}`);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {
      translationIds: oversizedBatch,
    });

    await expect(handler.execute(command)).rejects.toThrow(
      `Batch size exceeds maximum allowed (${MAX_BATCH_TRANSLATION_IDS})`
    );

    // Service should not be called
    expect(mockAccessService.verifyBranchAccess).not.toHaveBeenCalled();
    expect(mockRepository.findTranslationsForBatchEvaluation).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should return early when no translations found', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([]);
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(new Map());
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    const result = await handler.execute(command);

    expect(result.jobId).toBe('');
    expect(result.stats.total).toBe(0);
    expect(result.stats.cached).toBe(0);
    expect(result.stats.queued).toBe(0);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('should skip translations with valid cache', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    const sourceValue = 'Hello World';
    const translationValue = 'Hallo Welt';
    const validHash = generateContentHash(sourceValue, translationValue);

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([
      {
        id: 'trans-1',
        keyId: 'key-1',
        language: 'de',
        value: translationValue,
        qualityScore: { contentHash: validHash }, // Valid cache
      },
    ]);
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(
      new Map([['key-1', sourceValue]])
    );
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    const result = await handler.execute(command);

    // All cached, no job queued
    expect(result.jobId).toBe('');
    expect(result.stats.total).toBe(1);
    expect(result.stats.cached).toBe(1);
    expect(result.stats.queued).toBe(0);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('should queue translations with stale cache', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([
      {
        id: 'trans-1',
        keyId: 'key-1',
        language: 'de',
        value: 'Hallo Welt - updated', // Changed value
        qualityScore: { contentHash: 'old-hash' }, // Old hash
      },
    ]);
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(
      new Map([['key-1', 'Hello World']])
    );
    mockQueue.add.mockResolvedValue({ id: 'job-stale' } as Job);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    const result = await handler.execute(command);

    expect(result.stats.queued).toBe(1);
    expect(result.stats.cached).toBe(0);
    expect(mockQueue.add).toHaveBeenCalled();
  });

  it('should queue translations without source translation', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([
      {
        id: 'trans-1',
        keyId: 'key-1',
        language: 'de',
        value: 'Hallo',
        qualityScore: { contentHash: 'some-hash' },
      },
    ]);
    // No source translations found
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(new Map());
    mockQueue.add.mockResolvedValue({ id: 'job-nosrc' } as Job);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    const result = await handler.execute(command);

    expect(result.stats.queued).toBe(1);
    expect(mockQueue.add).toHaveBeenCalled();
  });

  it('should throw when BullMQ job is created without ID', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockRepository.findTranslationsForBatchEvaluation.mockResolvedValue([
      {
        id: 'trans-1',
        keyId: 'key-1',
        language: 'de',
        value: 'Hallo',
        qualityScore: null,
      },
    ]);
    mockRepository.findSourceTranslationsForKeys.mockResolvedValue(new Map([['key-1', 'Hello']]));
    // Job created without ID
    mockQueue.add.mockResolvedValue({} as Job);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    await expect(handler.execute(command)).rejects.toThrow(
      'Failed to create batch evaluation job: job ID not assigned'
    );

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
