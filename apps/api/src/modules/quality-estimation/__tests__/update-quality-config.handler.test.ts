import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { UpdateQualityConfigCommand } from '../commands/update-quality-config.command.js';
import { UpdateQualityConfigHandler } from '../commands/update-quality-config.handler.js';
import { QualityConfigUpdatedEvent } from '../events/quality-config-updated.event.js';
import type { QualityEstimationService } from '../quality-estimation.service.js';

describe('UpdateQualityConfigHandler', () => {
  const mockQualityService: {
    updateConfig: ReturnType<typeof vi.fn>;
    getConfig: ReturnType<typeof vi.fn>;
  } = {
    updateConfig: vi.fn(),
    getConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new UpdateQualityConfigHandler(
      mockQualityService as unknown as QualityEstimationService,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update config and emit event when user is authorized', async () => {
    const handler = createHandler();

    const updatedConfig = {
      aiEvaluationEnabled: true,
      aiEvaluationProvider: 'OPENAI',
      aiEvaluationModel: 'gpt-4o-mini',
      minScoreForHeuristic: 80,
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockQualityService.updateConfig.mockResolvedValue(undefined);
    mockQualityService.getConfig.mockResolvedValue(updatedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new UpdateQualityConfigCommand('project-1', 'user-1', {
      aiEvaluationEnabled: true,
    });

    const result = await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'OWNER',
      'MANAGER',
    ]);
    expect(mockQualityService.updateConfig).toHaveBeenCalledWith('project-1', {
      aiEvaluationEnabled: true,
    });
    expect(mockQualityService.getConfig).toHaveBeenCalledWith('project-1');

    // Verify event was published with correct payload
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as QualityConfigUpdatedEvent;
    expect(publishedEvent).toBeInstanceOf(QualityConfigUpdatedEvent);
    expect(publishedEvent.projectId).toBe('project-1');
    expect(publishedEvent.config).toEqual(updatedConfig);
    expect(publishedEvent.userId).toBe('user-1');

    expect(result).toEqual(updatedConfig);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new UpdateQualityConfigCommand('project-1', 'user-1', {
      aiEvaluationEnabled: false,
    });

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockQualityService.updateConfig).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should update multiple config fields', async () => {
    const handler = createHandler();

    const input = {
      aiEvaluationEnabled: true,
      aiEvaluationProvider: 'ANTHROPIC',
      aiEvaluationModel: 'claude-sonnet-4-5',
    };

    const updatedConfig = {
      ...input,
      minScoreForHeuristic: 75,
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockQualityService.updateConfig.mockResolvedValue(undefined);
    mockQualityService.getConfig.mockResolvedValue(updatedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new UpdateQualityConfigCommand('project-1', 'user-1', input);

    await handler.execute(command);

    expect(mockQualityService.updateConfig).toHaveBeenCalledWith('project-1', input);
  });
});
