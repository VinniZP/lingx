import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { SaveConfigCommand } from '../commands/save-config.command.js';
import { SaveConfigHandler } from '../commands/save-config.handler.js';
import { ConfigSavedEvent } from '../events/config-saved.event.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('SaveConfigHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockRepository = {
    saveConfig: vi.fn(),
  };

  const mockEventBus = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new SaveConfigHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSavedConfig = {
    id: 'config-1',
    provider: 'DEEPL' as const,
    keyPrefix: 'deepl-ke...',
    isActive: true,
    priority: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  it('should save config when user is MANAGER', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.saveConfig.mockResolvedValue(mockSavedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'DEEPL',
      apiKey: 'deepl-key-12345',
      isActive: true,
      priority: 0,
    });

    const result = await handler.execute(command);

    expect(result).toEqual(mockSavedConfig);
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.saveConfig).toHaveBeenCalledWith('project-1', {
      provider: 'DEEPL',
      apiKey: 'deepl-key-12345',
      isActive: true,
      priority: 0,
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ConfigSavedEvent));
  });

  it('should emit ConfigSavedEvent with correct data', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.saveConfig.mockResolvedValue(mockSavedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'DEEPL',
      apiKey: 'deepl-key-12345',
    });

    await handler.execute(command);

    const publishCall = mockEventBus.publish.mock.calls[0][0] as ConfigSavedEvent;
    expect(publishCall.config).toEqual(mockSavedConfig);
    expect(publishCall.userId).toBe('user-1');
    expect(publishCall.projectId).toBe('project-1');
  });

  it('should throw ForbiddenError when user is not MANAGER or OWNER', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Only managers and owners can configure machine translation')
    );

    const handler = createHandler();
    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'DEEPL',
      apiKey: 'deepl-key-12345',
    });

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepository.saveConfig).not.toHaveBeenCalled();
  });

  it('should allow OWNER to save config', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockRepository.saveConfig.mockResolvedValue(mockSavedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'GOOGLE_TRANSLATE',
      apiKey: 'google-api-key',
      isActive: false,
      priority: 1,
    });

    const result = await handler.execute(command);

    expect(result).toEqual(mockSavedConfig);
  });
});
