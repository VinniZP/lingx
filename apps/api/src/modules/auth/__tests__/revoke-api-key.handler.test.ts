/**
 * RevokeApiKeyHandler Unit Tests
 *
 * Tests that the handler correctly orchestrates:
 * - Ownership verification via repository
 * - API key revocation via repository
 * - Event publication
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { RevokeApiKeyCommand } from '../commands/revoke-api-key.command.js';
import { RevokeApiKeyHandler } from '../commands/revoke-api-key.handler.js';
import { ApiKeyRevokedEvent } from '../events/api-key-revoked.event.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';

describe('RevokeApiKeyHandler', () => {
  const mockApiKey = {
    id: 'apikey-123',
    keyPrefix: 'lf_abc123',
    keyHash: 'hashed_key',
    name: 'Test API Key',
    userId: 'user-123',
    createdAt: new Date(),
    revokedAt: null,
    lastUsedAt: null,
    expiresAt: null,
  };

  let mockApiKeyRepository: {
    findByIdAndUserId: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiKeyRepository = {
      findByIdAndUserId: vi.fn(),
      revoke: vi.fn(),
    };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new RevokeApiKeyHandler(
      mockApiKeyRepository as unknown as ApiKeyRepository,
      mockEventBus as unknown as IEventBus
    );

  it('should verify ownership, revoke API key, and publish event', async () => {
    // Arrange
    mockApiKeyRepository.findByIdAndUserId.mockResolvedValue(mockApiKey);
    mockApiKeyRepository.revoke.mockResolvedValue(undefined);

    const handler = createHandler();

    // Act
    await handler.execute(new RevokeApiKeyCommand('apikey-123', 'user-123'));

    // Assert - ownership verified
    expect(mockApiKeyRepository.findByIdAndUserId).toHaveBeenCalledWith('apikey-123', 'user-123');

    // Assert - revoked
    expect(mockApiKeyRepository.revoke).toHaveBeenCalledWith('apikey-123');

    // Assert - event published
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ApiKeyRevokedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as ApiKeyRevokedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.apiKeyId).toBe('apikey-123');
  });

  it('should throw NotFoundError when API key not found', async () => {
    // Arrange
    mockApiKeyRepository.findByIdAndUserId.mockResolvedValue(null);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(new RevokeApiKeyCommand('invalid-key', 'user-123'))
    ).rejects.toMatchObject({
      message: 'API key not found',
      statusCode: 404,
    });

    // Should NOT revoke or publish event
    expect(mockApiKeyRepository.revoke).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when API key belongs to different user', async () => {
    // Arrange - findByIdAndUserId returns null because userId doesn't match
    mockApiKeyRepository.findByIdAndUserId.mockResolvedValue(null);

    const handler = createHandler();

    // Act & Assert
    await expect(
      handler.execute(new RevokeApiKeyCommand('apikey-123', 'different-user'))
    ).rejects.toMatchObject({
      message: 'API key not found',
      statusCode: 404,
    });

    // Should NOT revoke or publish event
    expect(mockApiKeyRepository.revoke).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
