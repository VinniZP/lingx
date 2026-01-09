/**
 * RegenerateBackupCodesHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupCodesRegeneratedEvent } from '../events/backup-codes-regenerated.event.js';
import { RegenerateBackupCodesCommand } from '../totp/commands/regenerate-backup-codes.command.js';
import { RegenerateBackupCodesHandler } from '../totp/commands/regenerate-backup-codes.handler.js';

describe('RegenerateBackupCodesHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    replaceBackupCodes: ReturnType<typeof vi.fn>;
  };
  let mockCryptoService: {
    verifyPassword: ReturnType<typeof vi.fn>;
    generateBackupCodes: ReturnType<typeof vi.fn>;
    hashBackupCodes: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      replaceBackupCodes: vi.fn(),
    };
    mockCryptoService = {
      verifyPassword: vi.fn(),
      generateBackupCodes: vi.fn(),
      hashBackupCodes: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () =>
    new RegenerateBackupCodesHandler(
      mockRepository as any,
      mockCryptoService as any,
      mockEventBus as any
    );

  it('should regenerate backup codes after password verification', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      password: 'hashed-password',
    });
    mockCryptoService.verifyPassword.mockResolvedValue(true);
    mockCryptoService.generateBackupCodes.mockReturnValue(['CODE1234', 'CODE5678', 'CODE9012']);
    mockCryptoService.hashBackupCodes.mockResolvedValue(['hash1', 'hash2', 'hash3']);
    mockRepository.replaceBackupCodes.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new RegenerateBackupCodesCommand('user-123', 'correct-password');

    const result = await handler.execute(command);

    expect(result.codes).toEqual(['CODE1234', 'CODE5678', 'CODE9012']);
    expect(mockRepository.replaceBackupCodes).toHaveBeenCalledWith('user-123', [
      'hash1',
      'hash2',
      'hash3',
    ]);
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(BackupCodesRegeneratedEvent));
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new RegenerateBackupCodesCommand('non-existent', 'password');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when TOTP is not enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      password: 'hashed-password',
    });

    const handler = createHandler();
    const command = new RegenerateBackupCodesCommand('user-123', 'password');

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
    const command = new RegenerateBackupCodesCommand('user-123', 'wrong-password');

    await expect(handler.execute(command)).rejects.toThrow('Incorrect password');
    expect(mockRepository.replaceBackupCodes).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError for passwordless users', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      password: null,
    });

    const handler = createHandler();
    const command = new RegenerateBackupCodesCommand('user-123', 'some-password');

    await expect(handler.execute(command)).rejects.toThrow('cannot regenerate');
  });
});
