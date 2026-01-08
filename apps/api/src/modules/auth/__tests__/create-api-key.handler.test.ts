/**
 * CreateApiKeyHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiKeyService } from '../../../services/api-key.service.js';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { CreateApiKeyCommand } from '../commands/create-api-key.command.js';
import { CreateApiKeyHandler } from '../commands/create-api-key.handler.js';
import { ApiKeyCreatedEvent } from '../events/api-key-created.event.js';

describe('CreateApiKeyHandler', () => {
  const mockApiKeyResult = {
    key: 'lf_abc123def456',
    apiKey: {
      id: 'apikey-123',
      keyPrefix: 'lf_abc123',
      name: 'Test API Key',
      userId: 'user-123',
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: null,
      expiresAt: null,
    },
  };

  let mockApiKeyService: { create: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiKeyService = { create: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new CreateApiKeyHandler(
      mockApiKeyService as unknown as ApiKeyService,
      mockEventBus as unknown as IEventBus
    );

  it('should create API key and publish ApiKeyCreatedEvent', async () => {
    // Arrange
    mockApiKeyService.create.mockResolvedValue(mockApiKeyResult);

    const handler = createHandler();

    // Act
    const result = await handler.execute(new CreateApiKeyCommand('Test API Key', 'user-123'));

    // Assert
    expect(mockApiKeyService.create).toHaveBeenCalledWith({
      name: 'Test API Key',
      userId: 'user-123',
    });
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ApiKeyCreatedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as ApiKeyCreatedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.apiKeyId).toBe(mockApiKeyResult.apiKey.id);

    expect(result).toEqual(mockApiKeyResult);
  });

  it('should propagate errors without publishing event', async () => {
    // Arrange
    mockApiKeyService.create.mockRejectedValue(new Error('Database error'));

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new CreateApiKeyCommand('Test Key', 'user-123'))).rejects.toThrow(
      'Database error'
    );

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
