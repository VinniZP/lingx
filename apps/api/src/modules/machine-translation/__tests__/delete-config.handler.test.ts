import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { DeleteConfigCommand } from '../commands/delete-config.command.js';
import { DeleteConfigHandler } from '../commands/delete-config.handler.js';
import { ConfigDeletedEvent } from '../events/config-deleted.event.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('DeleteConfigHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    deleteConfig: vi.fn(),
  };

  const mockEventBus = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new DeleteConfigHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete config when user is MANAGER', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.deleteConfig.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteConfigCommand('project-1', 'user-1', 'DEEPL');

    const result = await handler.execute(command);

    expect(result).toEqual({ success: true });
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.deleteConfig).toHaveBeenCalledWith('project-1', 'DEEPL');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ConfigDeletedEvent));
  });

  it('should emit ConfigDeletedEvent with correct data', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.deleteConfig.mockResolvedValue(undefined);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DeleteConfigCommand('project-1', 'user-1', 'GOOGLE_TRANSLATE');

    await handler.execute(command);

    const publishCall = mockEventBus.publish.mock.calls[0][0] as ConfigDeletedEvent;
    expect(publishCall.provider).toBe('GOOGLE_TRANSLATE');
    expect(publishCall.userId).toBe('user-1');
    expect(publishCall.projectId).toBe('project-1');
  });

  it('should throw ForbiddenError when user is not MANAGER or OWNER', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Insufficient permissions for this operation')
    );

    const handler = createHandler();
    const command = new DeleteConfigCommand('project-1', 'user-1', 'DEEPL');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepository.deleteConfig).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when config does not exist', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.deleteConfig.mockRejectedValue(new NotFoundError('MT configuration for DEEPL'));

    const handler = createHandler();
    const command = new DeleteConfigCommand('project-1', 'user-1', 'DEEPL');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 404 });
  });
});
