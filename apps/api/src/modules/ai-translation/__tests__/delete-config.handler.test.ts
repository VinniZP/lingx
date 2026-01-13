import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { DeleteConfigCommand } from '../commands/delete-config.command.js';
import { DeleteConfigHandler } from '../commands/delete-config.handler.js';
import { ConfigDeletedEvent } from '../events/config-deleted.event.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';

describe('DeleteConfigHandler', () => {
  const mockRepository: { deleteConfig: ReturnType<typeof vi.fn> } = {
    deleteConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new DeleteConfigHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete config and emit event when user is authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.deleteConfig.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new DeleteConfigCommand('project-1', 'user-1', 'OPENAI');

    const result = await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.deleteConfig).toHaveBeenCalledWith('project-1', 'OPENAI');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ConfigDeletedEvent));
    expect(result).toEqual({ success: true });
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new DeleteConfigCommand('project-1', 'user-1', 'OPENAI');

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockRepository.deleteConfig).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw when config not found', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.deleteConfig.mockRejectedValue(new Error('Not found'));

    const command = new DeleteConfigCommand('project-1', 'user-1', 'ANTHROPIC');

    await expect(handler.execute(command)).rejects.toThrow('Not found');

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
