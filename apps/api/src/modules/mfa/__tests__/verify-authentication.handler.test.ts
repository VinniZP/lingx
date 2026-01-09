/**
 * VerifyAuthenticationHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeyAuthenticatedEvent } from '../events/passkey-authenticated.event.js';
import { VerifyAuthenticationCommand } from '../webauthn/commands/verify-authentication.command.js';
import { VerifyAuthenticationHandler } from '../webauthn/commands/verify-authentication.handler.js';

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 1,
    },
  }),
}));

describe('VerifyAuthenticationHandler', () => {
  let mockRepository: {
    findCredentialByCredentialId: ReturnType<typeof vi.fn>;
    updateCredentialCounter: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    rpId: string;
    origin: string;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findCredentialByCredentialId: vi.fn(),
      updateCredentialCounter: vi.fn(),
    };
    mockConfigService = {
      rpId: 'localhost',
      origin: 'http://localhost:3000',
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () =>
    new VerifyAuthenticationHandler(
      mockRepository as any,
      mockConfigService as any,
      mockEventBus as any
    );

  it('should verify authentication and update counter', async () => {
    mockRepository.findCredentialByCredentialId.mockResolvedValue({
      id: 'db-cred-id',
      userId: 'user-123',
      credentialId: 'cred-id-base64',
      publicKey: 'base64-public-key',
      counter: BigInt(0),
      transports: ['internal'],
      user: { id: 'user-123' },
    });

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('test-challenge', {
      id: 'cred-id-base64',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    const result = await handler.execute(command);

    expect(result.userId).toBe('user-123');
    expect(result.credentialId).toBe('db-cred-id');
    expect(mockRepository.updateCredentialCounter).toHaveBeenCalledWith('db-cred-id', BigInt(1));
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(PasskeyAuthenticatedEvent));
  });

  it('should throw UnauthorizedError when credential not found', async () => {
    mockRepository.findCredentialByCredentialId.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('test-challenge', {
      id: 'unknown-cred',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Passkey not found');
  });
});
