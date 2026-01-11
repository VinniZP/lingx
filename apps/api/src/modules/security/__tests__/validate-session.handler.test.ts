/**
 * ValidateSessionHandler Unit Tests
 */
import type { Session } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidateSessionHandler } from '../queries/validate-session.handler.js';
import { ValidateSessionQuery } from '../queries/validate-session.query.js';
import type { SessionCacheService } from '../session-cache.service.js';
import type { SessionRepository } from '../session.repository.js';

describe('ValidateSessionHandler', () => {
  let mockRepository: {
    findValidById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    isValid: ReturnType<typeof vi.fn>;
    setValid: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
  };

  const mockSession: Session = {
    id: 'session-123',
    userId: 'user-456',
    userAgent: null,
    deviceInfo: null,
    ipAddress: null,
    lastActive: new Date(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    trustedUntil: null,
  };

  beforeEach(() => {
    mockRepository = {
      findValidById: vi.fn(),
      delete: vi.fn(),
    };
    mockCache = {
      isValid: vi.fn(),
      setValid: vi.fn(),
      invalidate: vi.fn(),
    };
    mockLogger = { warn: vi.fn() };
  });

  const createHandler = () =>
    new ValidateSessionHandler(
      mockRepository as unknown as SessionRepository,
      mockCache as unknown as SessionCacheService,
      mockLogger as unknown as FastifyBaseLogger
    );

  it('should return true from cache hit (no DB query)', async () => {
    // Arrange - cache returns userId (valid)
    mockCache.isValid.mockResolvedValue('user-456');

    const handler = createHandler();
    const query = new ValidateSessionQuery('session-123');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBe(true);
    expect(mockCache.isValid).toHaveBeenCalledWith('session-123');
    expect(mockRepository.findValidById).not.toHaveBeenCalled(); // No DB query!
  });

  it('should return true and populate cache on cache miss with valid session', async () => {
    // Arrange - cache miss, DB has valid session
    mockCache.isValid.mockResolvedValue(null);
    mockRepository.findValidById.mockResolvedValue(mockSession);

    const handler = createHandler();
    const query = new ValidateSessionQuery('session-123');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBe(true);
    expect(mockCache.isValid).toHaveBeenCalledWith('session-123');
    expect(mockRepository.findValidById).toHaveBeenCalledWith('session-123');
    expect(mockCache.setValid).toHaveBeenCalledWith('session-123', 'user-456');
  });

  it('should return false on cache miss with no session in DB', async () => {
    // Arrange - cache miss, no session in DB
    mockCache.isValid.mockResolvedValue(null);
    mockRepository.findValidById.mockResolvedValue(null);

    const handler = createHandler();
    const query = new ValidateSessionQuery('nonexistent-session');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBe(false);
    expect(mockCache.setValid).not.toHaveBeenCalled();
  });

  it('should propagate repository errors', async () => {
    // Arrange
    mockCache.isValid.mockResolvedValue(null);
    mockRepository.findValidById.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();
    const query = new ValidateSessionQuery('session-123');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow('Database connection failed');
  });

  it('should fall back to DB and log warning when cache read fails', async () => {
    // Arrange - cache throws, valid session in DB
    mockCache.isValid.mockRejectedValue(new Error('Redis unavailable'));
    mockRepository.findValidById.mockResolvedValue(mockSession);

    const handler = createHandler();
    const query = new ValidateSessionQuery('session-123');

    // Act
    const result = await handler.execute(query);

    // Assert - should succeed via DB fallback
    expect(result).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-123' }),
      expect.stringContaining('cache read failed')
    );
  });

  it('should still succeed if cache population fails (logs warning)', async () => {
    // Arrange - cache miss, valid session in DB, but cache write fails
    mockCache.isValid.mockResolvedValue(null);
    mockRepository.findValidById.mockResolvedValue(mockSession);
    mockCache.setValid.mockRejectedValue(new Error('Redis unavailable'));

    const handler = createHandler();
    const query = new ValidateSessionQuery('session-123');

    // Act
    const result = await handler.execute(query);

    // Assert - should succeed despite cache failure
    expect(result).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-123' }),
      expect.stringContaining('Failed to populate')
    );
  });
});
