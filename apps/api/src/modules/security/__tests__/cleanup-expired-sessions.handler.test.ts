/**
 * CleanupExpiredSessionsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanupExpiredSessionsCommand } from '../commands/cleanup-expired-sessions.command.js';
import { CleanupExpiredSessionsHandler } from '../commands/cleanup-expired-sessions.handler.js';
import type { SessionRepository } from '../session.repository.js';

describe('CleanupExpiredSessionsHandler', () => {
  let mockRepository: {
    deleteExpired: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = { deleteExpired: vi.fn() };
  });

  const createHandler = () =>
    new CleanupExpiredSessionsHandler(mockRepository as unknown as SessionRepository);

  it('should delete expired sessions and return count', async () => {
    // Arrange
    mockRepository.deleteExpired.mockResolvedValue(5);

    const handler = createHandler();
    const command = new CleanupExpiredSessionsCommand();

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result).toBe(5);
    expect(mockRepository.deleteExpired).toHaveBeenCalled();
  });

  it('should return 0 when no expired sessions', async () => {
    // Arrange
    mockRepository.deleteExpired.mockResolvedValue(0);

    const handler = createHandler();
    const command = new CleanupExpiredSessionsCommand();

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result).toBe(0);
  });

  it('should propagate repository errors', async () => {
    // Arrange
    mockRepository.deleteExpired.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();
    const command = new CleanupExpiredSessionsCommand();

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
  });
});
