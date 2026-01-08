/**
 * GetSessionsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecurityService, SessionInfo } from '../../../services/security.service.js';
import { GetSessionsHandler } from '../queries/get-sessions.handler.js';
import { GetSessionsQuery } from '../queries/get-sessions.query.js';

describe('GetSessionsHandler', () => {
  const mockSessions: SessionInfo[] = [
    {
      id: 'session-1',
      deviceInfo: 'Chrome on macOS',
      ipAddress: '192.168.1.xxx',
      lastActive: '2024-01-15T10:00:00.000Z',
      createdAt: '2024-01-14T08:00:00.000Z',
      isCurrent: true,
    },
    {
      id: 'session-2',
      deviceInfo: 'Firefox on Windows',
      ipAddress: '10.0.0.xxx',
      lastActive: '2024-01-14T18:00:00.000Z',
      createdAt: '2024-01-13T12:00:00.000Z',
      isCurrent: false,
    },
  ];

  let mockSecurityService: { getSessions: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSecurityService = { getSessions: vi.fn() };
  });

  const createHandler = () =>
    new GetSessionsHandler(mockSecurityService as unknown as SecurityService);

  it('should return sessions for user', async () => {
    // Arrange
    mockSecurityService.getSessions.mockResolvedValue(mockSessions);

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(mockSecurityService.getSessions).toHaveBeenCalledWith('user-123', 'session-1');
    expect(result).toEqual(mockSessions);
    expect(result).toHaveLength(2);
    expect(result[0].isCurrent).toBe(true);
    expect(result[1].isCurrent).toBe(false);
  });

  it('should return empty array when no sessions', async () => {
    // Arrange
    mockSecurityService.getSessions.mockResolvedValue([]);

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toEqual([]);
  });

  it('should propagate errors from securityService', async () => {
    // Arrange
    mockSecurityService.getSessions.mockRejectedValue(new Error('Database unavailable'));

    const handler = createHandler();
    const query = new GetSessionsQuery('user-123', 'session-1');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow('Database unavailable');
  });
});
