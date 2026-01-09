/**
 * ConfirmTotpSetupHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpEnabledEvent } from '../events/totp-enabled.event.js';
import { ConfirmTotpSetupCommand } from '../totp/commands/confirm-totp-setup.command.js';
import { ConfirmTotpSetupHandler } from '../totp/commands/confirm-totp-setup.handler.js';

describe('ConfirmTotpSetupHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    enableTotp: ReturnType<typeof vi.fn>;
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
      enableTotp: vi.fn(),
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
    new ConfirmTotpSetupHandler(
      mockRepository as any,
      mockCryptoService as any,
      mockEventBus as any
    );

  it('should enable TOTP when token is valid', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(true);

    const handler = createHandler();
    const command = new ConfirmTotpSetupCommand('user-123', '123456');

    await handler.execute(command);

    expect(mockCryptoService.verifyToken).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '123456');
    expect(mockRepository.enableTotp).toHaveBeenCalledWith('user-123');
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TotpEnabledEvent));
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new ConfirmTotpSetupCommand('non-existent', '123456');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when TOTP already enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
    });

    const handler = createHandler();
    const command = new ConfirmTotpSetupCommand('user-123', '123456');

    await expect(handler.execute(command)).rejects.toThrow('already enabled');
  });

  it('should throw BadRequestError when setup not initiated', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      totpSecret: null,
      totpSecretIv: null,
    });

    const handler = createHandler();
    const command = new ConfirmTotpSetupCommand('user-123', '123456');

    await expect(handler.execute(command)).rejects.toThrow('initiate setup first');
  });

  it('should throw FieldValidationError when token is invalid', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      totpSecret: 'encrypted-secret',
      totpSecretIv: 'iv-hex',
    });
    mockCryptoService.decryptSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
    mockCryptoService.verifyToken.mockReturnValue(false);

    const handler = createHandler();
    const command = new ConfirmTotpSetupCommand('user-123', 'wrong-token');

    await expect(handler.execute(command)).rejects.toThrow('Invalid verification code');
    expect(mockRepository.enableTotp).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
