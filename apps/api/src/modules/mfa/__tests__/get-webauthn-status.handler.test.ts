/**
 * GetWebAuthnStatusHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetWebAuthnStatusHandler } from '../webauthn/queries/get-webauthn-status.handler.js';
import { GetWebAuthnStatusQuery } from '../webauthn/queries/get-webauthn-status.query.js';

describe('GetWebAuthnStatusHandler', () => {
  let mockRepository: {
    findUserForPasswordCheck: ReturnType<typeof vi.fn>;
    countCredentials: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserForPasswordCheck: vi.fn(),
      countCredentials: vi.fn(),
    };
  });

  const createHandler = () => new GetWebAuthnStatusHandler(mockRepository as any);

  it('should return full status with passkeys', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: 'hashed' });
    mockRepository.countCredentials.mockResolvedValue(3);

    const handler = createHandler();
    const query = new GetWebAuthnStatusQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toEqual({
      hasPasskeys: true,
      credentialsCount: 3,
      canGoPasswordless: true, // 3 >= 2
      isPasswordless: false,
    });
  });

  it('should return status for passwordless user', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: null });
    mockRepository.countCredentials.mockResolvedValue(2);

    const handler = createHandler();
    const query = new GetWebAuthnStatusQuery('user-123');

    const result = await handler.execute(query);

    expect(result.isPasswordless).toBe(true);
  });

  it('should return canGoPasswordless false with 1 passkey', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue({ password: 'hashed' });
    mockRepository.countCredentials.mockResolvedValue(1);

    const handler = createHandler();
    const query = new GetWebAuthnStatusQuery('user-123');

    const result = await handler.execute(query);

    expect(result.canGoPasswordless).toBe(false);
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserForPasswordCheck.mockResolvedValue(null);

    const handler = createHandler();
    const query = new GetWebAuthnStatusQuery('non-existent');

    await expect(handler.execute(query)).rejects.toThrow('User not found');
  });
});
