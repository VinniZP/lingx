/**
 * UpdateSessionActivityHandler Unit Tests
 */
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateSessionActivityCommand } from '../commands/update-session-activity.command.js';
import { UpdateSessionActivityHandler } from '../commands/update-session-activity.handler.js';
import type { SessionRepository } from '../session.repository.js';

describe('UpdateSessionActivityHandler', () => {
  let mockRepository: {
    updateLastActive: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = { updateLastActive: vi.fn() };
    mockLogger = { warn: vi.fn() };
  });

  const createHandler = () =>
    new UpdateSessionActivityHandler(
      mockRepository as unknown as SessionRepository,
      mockLogger as unknown as FastifyBaseLogger
    );

  it('should update session last activity timestamp', async () => {
    // Arrange
    mockRepository.updateLastActive.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new UpdateSessionActivityCommand('session-123');

    // Act
    await handler.execute(command);

    // Assert
    expect(mockRepository.updateLastActive).toHaveBeenCalledWith('session-123');
  });

  it('should not throw on P2025 errors (session deleted - expected)', async () => {
    // Arrange - repository throws P2025 (session deleted)
    const prismaError = new Error('Record not found') as Error & { code: string };
    prismaError.code = 'P2025';
    mockRepository.updateLastActive.mockRejectedValue(prismaError);

    const handler = createHandler();
    const command = new UpdateSessionActivityCommand('deleted-session');

    // Act & Assert - should not throw and should not log (expected case)
    await expect(handler.execute(command)).resolves.toBeUndefined();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should not throw but should log on unexpected errors', async () => {
    // Arrange - repository throws unexpected error
    mockRepository.updateLastActive.mockRejectedValue(new Error('Database connection failed'));

    const handler = createHandler();
    const command = new UpdateSessionActivityCommand('session-123');

    // Act & Assert - should not throw but should log
    await expect(handler.execute(command)).resolves.toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-123' }),
      expect.stringContaining('Failed to update session activity')
    );
  });
});
