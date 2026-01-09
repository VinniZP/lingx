/**
 * VerifyTotpHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpVerifiedEvent } from '../events/totp-verified.event.js';
import { VerifyTotpCommand } from '../totp/commands/verify-totp.command.js';
import { VerifyTotpHandler } from '../totp/commands/verify-totp.handler.js';

describe('VerifyTotpHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    incrementFailedAttempts: ReturnType<typeof vi.fn>;
    resetFailedAttempts: ReturnType<typeof vi.fn>;
    setSessionTrust: ReturnType<typeof vi.fn>;
  };
  let mockCryptoService: {
    decryptSecret: ReturnType<typeof vi.fn>;
    verifyToken: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      incrementFailedAttempts: vi.fn(),
      resetFailedAttempts: vi.fn(),
      setSessionTrust: vi.fn(),
    };
    mockCryptoService = {
      decryptSecret: vi.fn(),
      verifyToken: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () =>
    new VerifyTotpHandler(mockRepository as any, mockCryptoService as any, mockEventBus as any);

  it('should verify TOTP and reset failed attempts', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(true);

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', '123456');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockRepository.resetFailedAttempts).toHaveBeenCalledWith('user-123');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TotpVerifiedEvent));
  });

  it('should trust device when requested', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(true);

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', '123456', 'session-123', true);

    await handler.execute(command);

    expect(mockRepository.setSessionTrust).toHaveBeenCalledWith('session-123', expect.any(Date));
  });

  it('should not trust device when not requested', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(true);

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', '123456', 'session-123', false);

    await handler.execute(command);

    expect(mockRepository.setSessionTrust).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError when TOTP not enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
    });

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', '123456');

    await expect(handler.execute(command)).rejects.toThrow('not enabled');
  });

  it('should throw BadRequestError when user is locked out', async () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 10);
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
      totpFailedAttempts: 5,
      totpLockedUntil: futureDate,
    });

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', '123456');

    await expect(handler.execute(command)).rejects.toThrow('Too many failed attempts');
  });

  it('should increment failed attempts on invalid token', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
      totpFailedAttempts: 2,
      totpLockedUntil: null,
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(false);

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', 'wrong-token');

    await expect(handler.execute(command)).rejects.toThrow('Invalid verification code');
    expect(mockRepository.incrementFailedAttempts).toHaveBeenCalledWith('user-123', 3, null);
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should lock user after max failed attempts', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
      totpFailedAttempts: 4, // One more attempt will lock
      totpLockedUntil: null,
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(false);

    const handler = createHandler();
    const command = new VerifyTotpCommand('user-123', 'wrong-token');

    await expect(handler.execute(command)).rejects.toThrow('Invalid verification code');
    expect(mockRepository.incrementFailedAttempts).toHaveBeenCalledWith(
      'user-123',
      5,
      expect.any(Date) // Lockout date
    );
  });
});
