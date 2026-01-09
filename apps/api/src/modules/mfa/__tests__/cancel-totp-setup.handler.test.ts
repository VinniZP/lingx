/**
 * CancelTotpSetupHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelTotpSetupCommand } from '../totp/commands/cancel-totp-setup.command.js';
import { CancelTotpSetupHandler } from '../totp/commands/cancel-totp-setup.handler.js';

describe('CancelTotpSetupHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    clearTotpSetup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      clearTotpSetup: vi.fn(),
    };
  });

  const createHandler = () => new CancelTotpSetupHandler(mockRepository as any);

  it('should clear pending TOTP setup', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      totpSecret: 'pending-secret',
      totpSecretIv: 'pending-iv',
    });
    mockRepository.clearTotpSetup.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new CancelTotpSetupCommand('user-123');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockRepository.clearTotpSetup).toHaveBeenCalledWith('user-123');
  });

  it('should succeed even if no pending setup exists', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      totpSecret: null,
      totpSecretIv: null,
    });
    mockRepository.clearTotpSetup.mockResolvedValue(undefined);

    const handler = createHandler();
    const command = new CancelTotpSetupCommand('user-123');

    const result = await handler.execute(command);

    expect(result.success).toBe(true);
    expect(mockRepository.clearTotpSetup).toHaveBeenCalledWith('user-123');
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new CancelTotpSetupCommand('non-existent');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when TOTP is already enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpSecret: 'confirmed-secret',
      totpSecretIv: 'confirmed-iv',
    });

    const handler = createHandler();
    const command = new CancelTotpSetupCommand('user-123');

    await expect(handler.execute(command)).rejects.toThrow('already enabled');
  });
});
