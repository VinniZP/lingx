import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessService } from '../../access/access.service.js';
import { TestConnectionCommand } from '../commands/test-connection.command.js';
import { TestConnectionHandler } from '../commands/test-connection.handler.js';
import type { AITranslationRepository } from '../repositories/ai-translation.repository.js';
import type { AIProviderService } from '../services/ai-provider.service.js';

// Mock the 'ai' module at the top level
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'ok' }),
}));

describe('TestConnectionHandler', () => {
  const mockRepository: { getConfig: ReturnType<typeof vi.fn> } = {
    getConfig: vi.fn(),
  };

  const mockAccessService: { verifyProjectAccess: ReturnType<typeof vi.fn> } = {
    verifyProjectAccess: vi.fn(),
  };

  const mockProviderService: { getLanguageModel: ReturnType<typeof vi.fn> } = {
    getLanguageModel: vi.fn(),
  };

  const mockLogger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  } = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const createHandler = () =>
    new TestConnectionHandler(
      mockRepository as unknown as AITranslationRepository,
      mockAccessService as unknown as AccessService,
      mockProviderService as unknown as AIProviderService,
      mockLogger as unknown as FastifyBaseLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success when connection test passes', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getConfig.mockResolvedValue({
      id: 'config-1',
      provider: 'OPENAI',
      model: 'gpt-5-mini',
      apiKey: 'sk-123456789',
      isActive: true,
      priority: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock the language model
    const mockModel = {};
    mockProviderService.getLanguageModel.mockReturnValue(mockModel);

    const command = new TestConnectionCommand('project-1', 'user-1', 'OPENAI');

    const result = await handler.execute(command);

    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.getConfig).toHaveBeenCalledWith('project-1', 'OPENAI');
    expect(result.success).toBe(true);
  });

  it('should throw when user is not authorized', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockRejectedValue(new Error('Forbidden'));

    const command = new TestConnectionCommand('project-1', 'user-1', 'OPENAI');

    await expect(handler.execute(command)).rejects.toThrow('Forbidden');

    expect(mockRepository.getConfig).not.toHaveBeenCalled();
  });

  it('should return error when config not found', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getConfig.mockResolvedValue(null);

    const command = new TestConnectionCommand('project-1', 'user-1', 'ANTHROPIC');

    const result = await handler.execute(command);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No configuration found');
  });

  it('should return error and log when API call fails', async () => {
    const handler = createHandler();

    mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);
    mockRepository.getConfig.mockResolvedValue({
      id: 'config-1',
      provider: 'OPENAI',
      model: 'gpt-5-mini',
      apiKey: 'sk-123456789',
      isActive: true,
      priority: 0,
    });

    // Mock getLanguageModel to throw an error
    mockProviderService.getLanguageModel.mockImplementation(() => {
      throw new Error('Invalid API key');
    });

    const command = new TestConnectionCommand('project-1', 'user-1', 'OPENAI');

    const result = await handler.execute(command);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        provider: 'OPENAI',
        model: 'gpt-5-mini',
        error: 'Invalid API key',
      }),
      '[AI Translation] Connection test failed'
    );
  });
});
