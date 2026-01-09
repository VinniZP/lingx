/**
 * DisableTotpHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpDisabledEvent } from '../events/totp-disabled.event.js';
import { DisableTotpCommand } from '../totp/commands/disable-totp.command.js';
import { DisableTotpHandler } from '../totp/commands/disable-totp.handler.js';

describe('DisableTotpHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    disableTotp: ReturnType<typeof vi.fn>;
  };
  let mockCryptoService: {
    verifyPassword: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      disableTotp: vi.fn(),
    };
    mockCryptoService = {
      verifyPassword: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () =>
    new DisableTotpHandler(mockRepository as any, mockCryptoService as any, mockEventBus as any);

  it('should disable TOTP after password verification', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      password: 'hashed-password',
    });
    mockCryptoService.verifyPassword.mockResolvedValue(true);
    mockRepository.disableTotp.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new DisableTotpCommand('user-123', 'correct-password');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockCryptoService.verifyPassword).toHaveBeenCalledWith(
      'correct-password',
      'hashed-password'
    );
    expect(mockRepository.disableTotp).toHaveBeenCalledWith('user-123');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TotpDisabledEvent));
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new DisableTotpCommand('non-existent', 'password');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when TOTP is not enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      password: 'hashed-password',
    });

    const handler = createHandler();
    const command = new DisableTotpCommand('user-123', 'password');

    await expect(handler.execute(command)).rejects.toThrow('not enabled');
  });

  it('should throw FieldValidationError when password is incorrect', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      password: 'hashed-password',
    });
    mockCryptoService.verifyPassword.mockResolvedValue(false);

    const handler = createHandler();
    const command = new DisableTotpCommand('user-123', 'wrong-password');

    await expect(handler.execute(command)).rejects.toThrow('Incorrect password');
    expect(mockRepository.disableTotp).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError for passwordless users', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      password: null, // Passwordless user
    });

    const handler = createHandler();
    const command = new DisableTotpCommand('user-123', 'some-password');

    await expect(handler.execute(command)).rejects.toThrow('cannot disable');
  });
});
