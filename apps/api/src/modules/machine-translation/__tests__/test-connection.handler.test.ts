import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ForbiddenError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import { TestConnectionCommand } from '../commands/test-connection.command.js';
import { TestConnectionHandler } from '../commands/test-connection.handler.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';

describe('TestConnectionHandler', () => {
  const mockAccessService = {
    verifyProjectAccess: vi.fn(),
  };

  const mockMtProvider = {
    translate: vi.fn(),
  };

  const mockRepository = {
    getInitializedProvider: vi.fn(),
  };

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };

  const createHandler = () =>
    new TestConnectionHandler(
      mockRepository as unknown as MachineTranslationRepository,
      mockAccessService as unknown as AccessService,
      mockLogger as unknown as FastifyBaseLogger
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success when connection works', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockMtProvider.translate.mockResolvedValue({ text: 'Hola' });
    mockRepository.getInitializedProvider.mockResolvedValue(mockMtProvider);

    const handler = createHandler();
    const command = new TestConnectionCommand('project-1', 'user-1', 'DEEPL');

    const result = await handler.execute(command);

    expect(result).toEqual({ success: true });
    expect(mockAccessService.verifyProjectAccess).toHaveBeenCalledWith('user-1', 'project-1', [
      'MANAGER',
      'OWNER',
    ]);
    expect(mockRepository.getInitializedProvider).toHaveBeenCalledWith('project-1', 'DEEPL');
    expect(mockMtProvider.translate).toHaveBeenCalledWith('Hello', 'en', 'es');
  });

  it('should return error when translation fails and log the error', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'OWNER' });
    mockMtProvider.translate.mockRejectedValue(new Error('Invalid API key'));
    mockRepository.getInitializedProvider.mockResolvedValue(mockMtProvider);

    const handler = createHandler();
    const command = new TestConnectionCommand('project-1', 'user-1', 'DEEPL');

    const result = await handler.execute(command);

    expect(result).toEqual({
      success: false,
      error: 'Invalid API key',
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should return error when provider not found', async () => {
    mockAccessService.verifyProjectAccess.mockResolvedValue({ role: 'MANAGER' });
    mockRepository.getInitializedProvider.mockRejectedValue(
      new Error('MT configuration for DEEPL not found')
    );

    const handler = createHandler();
    const command = new TestConnectionCommand('project-1', 'user-1', 'DEEPL');

    const result = await handler.execute(command);

    expect(result).toEqual({
      success: false,
      error: 'MT configuration for DEEPL not found',
    });
  });

  it('should throw ForbiddenError when user is not MANAGER or OWNER', async () => {
    mockAccessService.verifyProjectAccess.mockRejectedValue(
      new ForbiddenError('Insufficient permissions for this operation')
    );

    const handler = createHandler();
    const command = new TestConnectionCommand('project-1', 'user-1', 'DEEPL');

    await expect(handler.execute(command)).rejects.toThrow(AppError);
    await expect(handler.execute(command)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepository.getInitializedProvider).not.toHaveBeenCalled();
  });
});
