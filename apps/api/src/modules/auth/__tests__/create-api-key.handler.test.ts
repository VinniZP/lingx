/**
 * CreateApiKeyHandler Unit Tests
 *
 * Tests that the handler correctly orchestrates:
 * - Key generation
 * - API key creation via repository
 * - Event publication
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../../../shared/cqrs/index.js';
import { CreateApiKeyCommand } from '../commands/create-api-key.command.js';
import { CreateApiKeyHandler } from '../commands/create-api-key.handler.js';
import { ApiKeyCreatedEvent } from '../events/api-key-created.event.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';

// Mock crypto for deterministic key generation in tests
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked_hash'),
  })),
  randomBytes: vi.fn(() => Buffer.from('a'.repeat(32))),
}));

describe('CreateApiKeyHandler', () => {
  const mockApiKey = {
    id: 'apikey-123',
    keyPrefix: 'lf_aaaaaaaa',
    name: 'Test API Key',
    userId: 'user-123',
    createdAt: new Date(),
    revokedAt: null,
    lastUsedAt: null,
    expiresAt: null,
  };

  let mockApiKeyRepository: { create: ReturnType<typeof vi.fn> };
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiKeyRepository = { create: vi.fn() };
    mockEventBus = { publish: vi.fn() };
  });

  const createHandler = () =>
    new CreateApiKeyHandler(
      mockApiKeyRepository as unknown as ApiKeyRepository,
      mockEventBus as unknown as IEventBus
    );

  it('should generate key, create via repository, and publish event', async () => {
    // Arrange
    mockApiKeyRepository.create.mockResolvedValue(mockApiKey);

    const handler = createHandler();

    // Act
    const result = await handler.execute(new CreateApiKeyCommand('Test API Key', 'user-123'));

    // Assert - repository called with correct data
    expect(mockApiKeyRepository.create).toHaveBeenCalledWith({
      name: 'Test API Key',
      userId: 'user-123',
      keyHash: 'mocked_hash',
      keyPrefix: expect.stringMatching(/^lf_/),
    });

    // Assert - event published
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(ApiKeyCreatedEvent));

    const publishedEvent = mockEventBus.publish.mock.calls[0][0] as ApiKeyCreatedEvent;
    expect(publishedEvent.userId).toBe('user-123');
    expect(publishedEvent.apiKeyId).toBe(mockApiKey.id);

    // Assert - result contains full key (shown once) and API key metadata
    expect(result.key).toMatch(/^lf_/);
    expect(result.apiKey).toEqual(mockApiKey);
  });

  it('should propagate errors without publishing event', async () => {
    // Arrange
    mockApiKeyRepository.create.mockRejectedValue(new Error('Database error'));

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new CreateApiKeyCommand('Test Key', 'user-123'))).rejects.toThrow(
      'Database error'
    );

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
