/**
 * VerifyBackupCodeHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupCodeUsedEvent } from '../events/backup-code-used.event.js';
import { VerifyBackupCodeCommand } from '../totp/commands/verify-backup-code.command.js';
import { VerifyBackupCodeHandler } from '../totp/commands/verify-backup-code.handler.js';

describe('VerifyBackupCodeHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    getUnusedBackupCodes: ReturnType<typeof vi.fn>;
    markBackupCodeUsed: ReturnType<typeof vi.fn>;
    resetFailedAttempts: ReturnType<typeof vi.fn>;
    setSessionTrust: ReturnType<typeof vi.fn>;
    incrementFailedAttempts: ReturnType<typeof vi.fn>;
  };
  let mockCryptoService: {
    verifyBackupCode: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      getUnusedBackupCodes: vi.fn(),
      markBackupCodeUsed: vi.fn(),
      resetFailedAttempts: vi.fn(),
      setSessionTrust: vi.fn(),
      incrementFailedAttempts: vi.fn(),
    };
    mockCryptoService = {
      verifyBackupCode: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () =>
    new VerifyBackupCodeHandler(
      mockRepository as any,
      mockCryptoService as any,
      mockEventBus as any
    );

  it('should verify backup code and mark as used', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockRepository.getUnusedBackupCodes.mockResolvedValue([
      { id: 'code-1', codeHash: 'hash-1' },
      { id: 'code-2', codeHash: 'hash-2' },
    ]);
    // First code doesn't match, second does
    mockCryptoService.verifyBackupCode.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockRepository.markBackupCodeUsed.mockResolvedValue(undefined);
    mockRepository.resetFailedAttempts.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'ABCD-EFGH');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(result.remainingCodes).toBe(1);
    expect(mockRepository.markBackupCodeUsed).toHaveBeenCalledWith('code-2');
    expect(mockRepository.resetFailedAttempts).toHaveBeenCalledWith('user-123');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(BackupCodeUsedEvent));
  });

  it('should trust device when requested', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockRepository.getUnusedBackupCodes.mockResolvedValue([{ id: 'code-1', codeHash: 'hash-1' }]);
    mockCryptoService.verifyBackupCode.mockResolvedValue(true);

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'ABCD-EFGH', 'session-123', true);

    await handler.execute(command);

    expect(mockRepository.setSessionTrust).toHaveBeenCalledWith('session-123', expect.any(Date));
  });

  it('should not trust device when not requested', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockRepository.getUnusedBackupCodes.mockResolvedValue([{ id: 'code-1', codeHash: 'hash-1' }]);
    mockCryptoService.verifyBackupCode.mockResolvedValue(true);

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'ABCD-EFGH', 'session-123', false);

    await handler.execute(command);

    expect(mockRepository.setSessionTrust).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError when TOTP not enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
    });

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'ABCD-EFGH');

    await expect(handler.execute(command)).rejects.toThrow('not enabled');
  });

  it('should throw FieldValidationError when backup code is invalid', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockRepository.getUnusedBackupCodes.mockResolvedValue([{ id: 'code-1', codeHash: 'hash-1' }]);
    mockCryptoService.verifyBackupCode.mockResolvedValue(false);

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'WRONG-CODE');

    await expect(handler.execute(command)).rejects.toThrow('Invalid backup code');
    expect(mockRepository.incrementFailedAttempts).toHaveBeenCalledWith('user-123', 1, null);
    expect(mockRepository.markBackupCodeUsed).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('non-existent', 'ABCD-EFGH');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when no backup codes exist', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    });
    mockRepository.getUnusedBackupCodes.mockResolvedValue([]);

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'ABCD-EFGH');

    await expect(handler.execute(command)).rejects.toThrow('No backup codes');
  });

  it('should throw BadRequestError when account is locked', async () => {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 10); // 10 minutes from now
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpFailedAttempts: 5,
      totpLockedUntil: futureDate,
    });

    const handler = createHandler();
    const command = new VerifyBackupCodeCommand('user-123', 'ABCD-EFGH');

    await expect(handler.execute(command)).rejects.toThrow('Too many failed attempts');
    expect(mockRepository.getUnusedBackupCodes).not.toHaveBeenCalled();
  });
});
