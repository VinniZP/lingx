/**
 * InitiateTotpSetupHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitiateTotpSetupCommand } from '../totp/commands/initiate-totp-setup.command.js';
import { InitiateTotpSetupHandler } from '../totp/commands/initiate-totp-setup.handler.js';

describe('InitiateTotpSetupHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    saveTotpSetup: ReturnType<typeof vi.fn>;
  };
  let mockCryptoService: {
    generateSecret: ReturnType<typeof vi.fn>;
    encryptSecret: ReturnType<typeof vi.fn>;
    generateBackupCodes: ReturnType<typeof vi.fn>;
    hashBackupCodes: ReturnType<typeof vi.fn>;
    generateQrCodeUri: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      saveTotpSetup: vi.fn(),
    };
    mockCryptoService = {
      generateSecret: vi.fn(),
      encryptSecret: vi.fn(),
      generateBackupCodes: vi.fn(),
      hashBackupCodes: vi.fn(),
      generateQrCodeUri: vi.fn(),
    };
  });

  const createHandler = () =>
    new InitiateTotpSetupHandler(mockRepository as any, mockCryptoService as any);

  it('should generate secret, backup codes, and store setup data', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      totpEnabled: false,
    });
    mockCryptoService.generateSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.encryptSecret.mockReturnValue({ encrypted: 'enc-secret', iv: 'iv-hex' });
    mockCryptoService.generateBackupCodes.mockReturnValue(['CODE1111', 'CODE2222']);
    mockCryptoService.hashBackupCodes.mockResolvedValue(['hash1', 'hash2']);
    mockCryptoService.generateQrCodeUri.mockReturnValue(
      'otpauth://totp/Lingx:test@example.com?secret=JBSWY3DPEHPK3PXP'
    );

    const handler = createHandler();
    const command = new InitiateTotpSetupCommand('user-123');

    const result = await handler.execute(command);

    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.qrCodeUri).toBe('otpauth://totp/Lingx:test@example.com?secret=JBSWY3DPEHPK3PXP');
    expect(result.backupCodes).toEqual(['CODE1111', 'CODE2222']);

    expect(mockRepository.saveTotpSetup).toHaveBeenCalledWith('user-123', {
      encryptedSecret: 'enc-secret',
      secretIv: 'iv-hex',
      backupCodeHashes: ['hash1', 'hash2'],
    });
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new InitiateTotpSetupCommand('non-existent');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when TOTP already enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      totpEnabled: true,
    });

    const handler = createHandler();
    const command = new InitiateTotpSetupCommand('user-123');

    await expect(handler.execute(command)).rejects.toThrow('already enabled');
  });
});
