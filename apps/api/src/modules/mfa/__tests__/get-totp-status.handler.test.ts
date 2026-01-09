/**
 * GetTotpStatusHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetTotpStatusHandler } from '../totp/queries/get-totp-status.handler.js';
import { GetTotpStatusQuery } from '../totp/queries/get-totp-status.query.js';

describe('GetTotpStatusHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    countUnusedBackupCodes: ReturnType<typeof vi.fn>;
    countTrustedSessions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
      countUnusedBackupCodes: vi.fn(),
      countTrustedSessions: vi.fn(),
    };
  });

  const createHandler = () => new GetTotpStatusHandler(mockRepository as any);

  it('should return full status when TOTP is enabled', async () => {
    const enabledAt = new Date('2024-01-15T10:00:00Z');
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
      totpEnabledAt: enabledAt,
    });
    mockRepository.countUnusedBackupCodes.mockResolvedValue(8);
    mockRepository.countTrustedSessions.mockResolvedValue(2);

    const handler = createHandler();
    const query = new GetTotpStatusQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toEqual({
      enabled: true,
      enabledAt: enabledAt.toISOString(),
      backupCodesRemaining: 8,
      trustedDevicesCount: 2,
    });
  });

  it('should return disabled status when TOTP is not enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
      totpEnabledAt: null,
    });

    const handler = createHandler();
    const query = new GetTotpStatusQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toEqual({
      enabled: false,
      enabledAt: null,
      backupCodesRemaining: 0,
      trustedDevicesCount: 0,
    });
    // Should not query backup codes or trusted devices when disabled
    expect(mockRepository.countUnusedBackupCodes).not.toHaveBeenCalled();
    expect(mockRepository.countTrustedSessions).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const query = new GetTotpStatusQuery('non-existent');

    await expect(handler.execute(query)).rejects.toThrow('User not found');
  });
});
