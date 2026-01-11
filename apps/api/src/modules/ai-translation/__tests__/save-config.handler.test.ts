import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../../services/access.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { SaveConfigCommand } from '../commands/save-config.command.js';
import { SaveConfigHandler } from '../commands/save-config.handler.js';
import { ConfigSavedEvent } from '../events/config-saved.event.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';

describe('SaveConfigHandler', () => {
  const mockRepository: { saveConfig: ReturnType<typeof vi.fn> } = {
    saveConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockEventBus: { publish: ReturnType<typeof vi.fn> } = {
    publish: vi.fn(),
  };

  const createHandler = () =>
    new SaveConfigHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService,
      mockEventBus as unknown as IEventBus
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save config and emit event when user is authorized', async () => {
    const handler = createHandler();

    const savedConfig = {
      id: 'config-1',
      provider: 'OPENAI',
      model: 'gpt-5-mini',
      keyPrefix: 'sk-12345...',
      isActive: true,
      priority: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.saveConfig.mockResolvedValue(savedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'OPENAI',
      apiKey: 'sk-123456789',
      model: 'gpt-5-mini',
      isActive: true,
      priority: 0,
    });

    const result = await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.saveConfig).toHaveBeenCalledWith('project-1', {
      provider: 'OPENAI',
      apiKey: 'sk-123456789',
      model: 'gpt-5-mini',
      isActive: true,
      priority: 0,
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ConfigSavedEvent));
    expect(result).toEqual(savedConfig);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'OPENAI',
      apiKey: 'sk-123456789',
      model: 'gpt-5-mini',
    });

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockRepository.saveConfig).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should save config without apiKey for update', async () => {
    const handler = createHandler();

    const savedConfig = {
      id: 'config-1',
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4-5',
      keyPrefix: 'sk-ant-...',
      isActive: false,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.saveConfig.mockResolvedValue(savedConfig);
    mockEventBus.publish.mockResolvedValue(undefined);

    const command = new SaveConfigCommand('project-1', 'user-1', {
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4-5',
      isActive: false,
      priority: 1,
    });

    const result = await handler.execute(command);

    expect(mockRepository.saveConfig).toHaveBeenCalledWith('project-1', {
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4-5',
      isActive: false,
      priority: 1,
    });
    expect(result).toEqual(savedConfig);
  });
});
