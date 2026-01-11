import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { UpdateContextConfigCommand } from '../commands/update-context-config.command.js';
import { UpdateContextConfigHandler } from '../commands/update-context-config.handler.js';
import { ContextConfigUpdatedEvent } from '../events/context-config-updated.event.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';

describe('UpdateContextConfigHandler', () => {
  const mockRepository: { updateContextConfig: ReturnType<typeof vi.fn> } = {
    updateContextConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new UpdateContextConfigHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update context config and emit event when user is authorized', async () => {
    const handler = createHandler();

    const updatedConfig = {
      includeGlossary: true,
      glossaryLimit: 15,
      includeTM: false,
      tmLimit: 3,
      tmMinSimilarity: 0.8,
      includeRelatedKeys: true,
      relatedKeysLimit: 10,
      includeDescription: true,
      customInstructions: 'Use formal tone',
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.updateContextConfig.mockResolvedValue(updatedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new UpdateContextConfigCommand('project-1', 'user-1', {
      glossaryLimit: 15,
      includeTM: false,
      customInstructions: 'Use formal tone',
    });

    const result = await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.updateContextConfig).toHaveBeenCalledWith('project-1', {
      glossaryLimit: 15,
      includeTM: false,
      customInstructions: 'Use formal tone',
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ContextConfigUpdatedEvent));
    expect(result).toEqual(updatedConfig);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new UpdateContextConfigCommand('project-1', 'user-1', {
      glossaryLimit: 15,
    });

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockRepository.updateContextConfig).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
