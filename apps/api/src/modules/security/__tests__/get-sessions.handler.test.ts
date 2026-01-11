/**
 * GetSessionsHandler Unit Tests
 */
import type { Session } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetSessionsHandler } from '../queries/get-sessions.handler.js';
import { GetSessionsQuery } from '../queries/get-sessions.query.js';
import type { SessionRepository } from '../session.repository.js';

describe('GetSessionsHandler', () => {
  const now = new Date('2024-01-15T10:00:00.000Z');
  const yesterday = new Date('2024-01-14T08:00:00.000Z');

  const mockDbSessions: Session[] = [
    {
      id: 'session-1',
      userId: 'user-123',
      deviceInfo: 'Chrome on macOS',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.100',
      lastActive: now,
      createdAt: yesterday,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      trustedUntil: null,
    },
    {
      id: 'session-2',
      userId: 'user-123',
      deviceInfo: 'Firefox on Windows',
      userAgent: 'Mozilla/5.0',
      ipAddress: '10.0.0.50',
      lastActive: new Date('2024-01-14T18:00:00.000Z'),
      createdAt: new Date('2024-01-13T12:00:00.000Z'),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      trustedUntil: null,
    },
  ];

  let mockRepository: { findByUserId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRepository = { findByUserId: vi.fn() };
  });

  const createHandler = () =>
    new GetSessionsHandler(mockRepository as unknown as SessionRepository);

  it('should return sessions with masked IPs and isCurrent flag', async () => {
    // Arrange
    mockRepository.findByUserId.mockResolvedValue(mockDbSessions);

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
    expect(result).toHaveLength(2);

    // First session is current
    expect(result[0].id).toBe('session-1');
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].ipAddress).toBe('192.168.1.xxx'); // Masked
    expect(result[0].lastActive).toBe('2024-01-15T10:00:00.000Z');
    expect(result[0].deviceInfo).toBe('Chrome on macOS');

    // Second session is not current
    expect(result[1].id).toBe('session-2');
    expect(result[1].isCurrent).toBe(false);
    expect(result[1].ipAddress).toBe('10.0.0.xxx'); // Masked
  });

  it('should return empty array when no sessions', async () => {
    // Arrange
    mockRepository.findByUserId.mockResolvedValue([]);

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toEqual([]);
  });

  it('should handle null IP addresses', async () => {
    // Arrange
    mockRepository.findByUserId.mockResolvedValue([{ ...mockDbSessions[0], ipAddress: null }]);

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result[0].ipAddress).toBeNull();
  });

  it('should propagate repository errors', async () => {
    // Arrange
    mockRepository.findByUserId.mockRejectedValue(new Error('Database unavailable'));

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow('Database unavailable');
  });
});
