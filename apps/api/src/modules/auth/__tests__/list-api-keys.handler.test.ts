/**
 * ListApiKeysHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListApiKeysHandler } from '../queries/list-api-keys.handler.js';
import { ListApiKeysQuery } from '../queries/list-api-keys.query.js';

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

  let mockApiKeyService: { list: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApiKeyService = { list: vi.fn() };
  });

  it('should return list of API keys for user', async () => {
    // Arrange
    mockApiKeyService.list.mockResolvedValue(mockApiKeys);

    const handler = new ListApiKeysHandler(mockApiKeyService as never);

    // Act
    const result = await handler.execute(new ListApiKeysQuery('user-123'));

    // Assert
    expect(mockApiKeyService.list).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(mockApiKeys);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when user has no API keys', async () => {
    // Arrange
    mockApiKeyService.list.mockResolvedValue([]);

    const handler = new ListApiKeysHandler(mockApiKeyService as never);

    // Act
    const result = await handler.execute(new ListApiKeysQuery('user-no-keys'));

    // Assert
    expect(mockApiKeyService.list).toHaveBeenCalledWith('user-no-keys');
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should propagate errors from apiKeyService', async () => {
    // Arrange
    mockApiKeyService.list.mockRejectedValue(new Error('Database error'));

    const handler = new ListApiKeysHandler(mockApiKeyService as never);

    // Act & Assert
    await expect(handler.execute(new ListApiKeysQuery('user-123'))).rejects.toThrow(
      'Database error'
    );
  });
});
