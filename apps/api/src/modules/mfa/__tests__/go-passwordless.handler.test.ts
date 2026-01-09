/**
 * GoPasswordlessHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WentPasswordlessEvent } from '../events/went-passwordless.event.js';
import { GoPasswordlessCommand } from '../webauthn/commands/go-passwordless.command.js';
import { GoPasswordlessHandler } from '../webauthn/commands/go-passwordless.handler.js';

describe('GoPasswordlessHandler', () => {
  let mockRepository: {
    findUserForPasswordCheck: ReturnType<typeof vi.fn>;
    countCredentials: ReturnType<typeof vi.fn>;
    setPasswordless: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserForPasswordCheck: vi.fn(),
      countCredentials: vi.fn(),
      setPasswordless: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () => new GoPasswordlessHandler(mockRepository as any, mockEventBus as any);

  it('should remove password when user has enough passkeys', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: 'hashed' });
    mockRepository.countCredentials.mockResolvedValue(2); // Minimum required

    const handler = createHandler();
    const command = new GoPasswordlessCommand('user-123');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockRepository.setPasswordless).toHaveBeenCalledWith('user-123');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(WentPasswordlessEvent));
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue(null);

    const handler = createHandler();
    const command = new GoPasswordlessCommand('non-existent');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when already passwordless', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: null });

    const handler = createHandler();
    const command = new GoPasswordlessCommand('user-123');

    await expect(handler.execute(command)).rejects.toThrow('already passwordless');
  });

  it('should throw BadRequestError when not enough passkeys', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: 'hashed' });
    mockRepository.countCredentials.mockResolvedValue(1); // Only 1, need 2

    const handler = createHandler();
    const command = new GoPasswordlessCommand('user-123');

    await expect(handler.execute(command)).rejects.toThrow('at least 2 passkeys');
    expect(mockRepository.setPasswordless).not.toHaveBeenCalled();
  });
});
