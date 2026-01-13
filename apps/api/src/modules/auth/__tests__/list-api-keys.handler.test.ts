/**
 * ListApiKeysHandler Unit Tests
 *
 * Tests that the handler correctly retrieves API keys via repository.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListApiKeysHandler } from '../queries/list-api-keys.handler.js';
import { ListApiKeysQuery } from '../queries/list-api-keys.query.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';

describe('ListApiKeysHandler', () => {
  const mockApiKeys = [
    {
      id: 'apikey-1',
      keyPrefix: 'lf_abc123',
      name: 'Production Key',
      userId: 'user-123',
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: new Date(),
      expiresAt: null,
    },
    {
      id: 'apikey-2',
      keyPrefix: 'lf_def456',
      name: 'Development Key',
      userId: 'user-123',
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: null,
      expiresAt: null,
    },
  ];

  let mockApiKeyRepository: { findByUserId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiKeyRepository = { findByUserId: vi.fn() };
  });

  const createHandler = () =>
    new ListApiKeysHandler(mockApiKeyRepository as unknown as ApiKeyRepository);

  it('should return list of API keys for user', async () => {
    // Arrange
    mockApiKeyRepository.findByUserId.mockResolvedValue(mockApiKeys);

    const handler = createHandler();

    // Act
    const result = await handler.execute(new ListApiKeysQuery('user-123'));

    // Assert
    expect(mockApiKeyRepository.findByUserId).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(mockApiKeys);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when user has no API keys', async () => {
    // Arrange
    mockApiKeyRepository.findByUserId.mockResolvedValue([]);

    const handler = createHandler();

    // Act
    const result = await handler.execute(new ListApiKeysQuery('user-no-keys'));

    // Assert
    expect(mockApiKeyRepository.findByUserId).toHaveBeenCalledWith('user-no-keys');
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should propagate errors from repository', async () => {
    // Arrange
    mockApiKeyRepository.findByUserId.mockRejectedValue(new Error('Database error'));

    const handler = createHandler();

    // Act & Assert
    await expect(handler.execute(new ListApiKeysQuery('user-123'))).rejects.toThrow(
      'Database error'
    );
  });
});
