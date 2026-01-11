import { MAX_BATCH_TRANSLATION_IDS } from '@lingx/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { BatchEvaluationService } from '../../../services/batch-evaluation.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { QueueBatchEvaluationCommand } from '../commands/queue-batch-evaluation.command.js';
import { QueueBatchEvaluationHandler } from '../commands/queue-batch-evaluation.handler.js';
import { BatchEvaluationQueuedEvent } from '../events/batch-evaluation-queued.event.js';

describe('QueueBatchEvaluationHandler', () => {
  const mockBatchService: { evaluateBranch: ReturnType<typeof vi.fn> } = {
    evaluateBranch: vi.fn(),
  };

  const mockAccessService: { verifyBranchAccess: ReturnType<typeof vi.fn> } = {
    verifyBranchAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new QueueBatchEvaluationHandler(
      mockBatchService as unknown as BatchEvaluationService,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
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

    const batchResult = {
      jobId: 'job-123',
      stats: {
        total: 100,
        cached: 30,
        queued: 70,
      },
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockBatchService.evaluateBranch.mockResolvedValue(batchResult);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    const result = await handler.execute(command);

    expect(mockAccessService.verifyBranchAccess).toHaveBeenCalledWith('user-1', 'branch-1');
    expect(mockBatchService.evaluateBranch).toHaveBeenCalledWith(
      'branch-1',
      'user-1',
      projectInfo,
      {}
    );

    // Verify event was published with correct payload
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as BatchEvaluationQueuedEvent;
    expect(publishedEvent).toBeInstanceOf(BatchEvaluationQueuedEvent);
    expect(publishedEvent.branchId).toBe('branch-1');
    expect(publishedEvent.jobId).toBe('job-123');
    expect(publishedEvent.stats).toEqual({ total: 100, cached: 30, queued: 70 });
    expect(publishedEvent.userId).toBe('user-1');

    expect(result).toEqual(batchResult);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyBranchAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {});

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockBatchService.evaluateBranch).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should pass translationIds and forceAI options', async () => {
    const handler = createHandler();

    const projectInfo = {
      projectId: 'project-1',
      defaultLanguage: 'en',
      languages: ['en', 'de'],
    };

    const batchResult = {
      jobId: 'job-456',
      stats: { total: 5, cached: 0, queued: 5 },
    };

    mockAccessService.verifyBranchAccess.mockResolvedValue(projectInfo);
    mockBatchService.evaluateBranch.mockResolvedValue(batchResult);
    mockEventBus.publish.mockResolvedValue(undefined);

    const translationIds = ['t1', 't2', 't3'];
    const command = new QueueBatchEvaluationCommand('branch-1', 'user-1', {
      translationIds,
      forceAI: true,
    });

    await handler.execute(command);

    expect(mockBatchService.evaluateBranch).toHaveBeenCalledWith(
      'branch-1',
      'user-1',
      projectInfo,
      {
        translationIds,
        forceAI: true,
      }
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
    expect(mockBatchService.evaluateBranch).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
