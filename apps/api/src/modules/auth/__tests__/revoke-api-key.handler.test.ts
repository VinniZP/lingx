/**
 * RevokeApiKeyHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../plugins/error-handler.js';
import { RevokeApiKeyCommand } from '../commands/revoke-api-key.command.js';
import { RevokeApiKeyHandler } from '../commands/revoke-api-key.handler.js';
import { ApiKeyRevokedEvent } from '../events/api-key-revoked.event.js';

describe('RevokeApiKeyHandler', () => {
  let mockApiKeyService: { revoke: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiKeyService = { revoke: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  it('should revoke API key and publish ApiKeyRevokedEvent', async () => {
    // Arrange
    mockApiKeyService.revoke.mockResolvedValue(undefined);

    const handler = new RevokeApiKeyHandler(mockApiKeyService as never, mockEventBus as never);

    // Act
    await handler.execute(new RevokeApiKeyCommand('apikey-123', 'user-123'));

    // Assert
    expect(mockApiKeyService.revoke).toHaveBeenCalledWith('apikey-123', 'user-123');
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ApiKeyRevokedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as ApiKeyRevokedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.apiKeyId).toBe('apikey-123');
  });

  it('should propagate NotFoundError for invalid API key', async () => {
    // Arrange
    mockApiKeyService.revoke.mockRejectedValue(new NotFoundError('API key'));

    const handler = new RevokeApiKeyHandler(mockApiKeyService as never, mockEventBus as never);

    // Act & Assert
    await expect(
      handler.execute(new RevokeApiKeyCommand('invalid-key', 'user-123'))
    ).rejects.toMatchObject({
      message: 'API key not found',
      statusCode: 404,
    });

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
