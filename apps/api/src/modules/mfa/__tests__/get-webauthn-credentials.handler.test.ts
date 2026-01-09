/**
 * GetWebAuthnCredentialsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetWebAuthnCredentialsHandler } from '../webauthn/queries/get-webauthn-credentials.handler.js';
import { GetWebAuthnCredentialsQuery } from '../webauthn/queries/get-webauthn-credentials.query.js';

describe('GetWebAuthnCredentialsHandler', () => {
  let mockRepository: {
    listCredentials: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      listCredentials: vi.fn(),
    };
  });

  const createHandler = () => new GetWebAuthnCredentialsHandler(mockRepository as any);

  it('should return list of credentials', async () => {
    const now = new Date();
    mockRepository.listCredentials.mockResolvedValue([
      {
        id: 'cred-1',
        name: 'My MacBook',
        createdAt: now,
        lastUsedAt: now,
        deviceType: 'multiDevice',
        backedUp: true,
      },
      {
        id: 'cred-2',
        name: 'My iPhone',
        createdAt: now,
        lastUsedAt: null,
        deviceType: 'singleDevice',
        backedUp: false,
      },
    ]);

    const handler = createHandler();
    const query = new GetWebAuthnCredentialsQuery('user-123');

    const result = await handler.execute(query);

    expect(result.credentials).toHaveLength(2);
    expect(result.credentials[0].name).toBe('My MacBook');
    expect(result.credentials[1].deviceType).toBe('singleDevice');
  });

  it('should return empty array when no credentials', async () => {
    mockRepository.listCredentials.mockResolvedValue([]);

    const handler = createHandler();
    const query = new GetWebAuthnCredentialsQuery('user-123');

    const result = await handler.execute(query);

    expect(result.credentials).toEqual([]);
  });
});
