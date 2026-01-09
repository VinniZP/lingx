/**
 * VerifyAuthenticationHandler Unit Tests
 */
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
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

const mockVerifyAuthenticationResponse = vi.mocked(verifyAuthenticationResponse);

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
  let mockChallengeStore: {
    consume: ReturnType<typeof vi.fn>;
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
    mockChallengeStore = {
      consume: vi.fn(),
    };
  });

  const createHandler = () =>
    new VerifyAuthenticationHandler(
      mockRepository as any,
      mockConfigService as any,
      mockEventBus as any,
      mockChallengeStore as any
    );

  it('should verify authentication and update counter', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-auth',
    });
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
    const command = new VerifyAuthenticationCommand('challenge-token', {
      id: 'cred-id-base64',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    const result = await handler.execute(command);

    expect(result.userId).toBe('user-123');
    expect(result.credentialId).toBe('db-cred-id');
    expect(mockChallengeStore.consume).toHaveBeenCalledWith('challenge-token');
    expect(mockRepository.updateCredentialCounter).toHaveBeenCalledWith('db-cred-id', BigInt(1));
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(PasskeyAuthenticatedEvent));
  });

  it('should throw BadRequestError when challenge expired', async () => {
    mockChallengeStore.consume.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('expired-token', {
      id: 'cred-id-base64',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Challenge expired or invalid');
  });

  it('should throw BadRequestError when wrong purpose', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-register', // wrong purpose
    });

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('challenge-token', {
      id: 'cred-id-base64',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Invalid challenge token');
  });

  it('should throw UnauthorizedError when credential not found', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-auth',
    });
    mockRepository.findCredentialByCredentialId.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('challenge-token', {
      id: 'unknown-cred',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Passkey not found');
  });

  it('should throw UnauthorizedError when WebAuthn library throws an error', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-auth',
    });
    mockRepository.findCredentialByCredentialId.mockResolvedValue({
      id: 'db-cred-id',
      userId: 'user-123',
      credentialId: 'cred-id-base64',
      publicKey: 'base64-public-key',
      counter: BigInt(0),
      transports: ['internal'],
      user: { id: 'user-123' },
    });
    mockVerifyAuthenticationResponse.mockRejectedValueOnce(new Error('Invalid signature'));

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('challenge-token', {
      id: 'cred-id-base64',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Authentication verification failed');
    expect(mockRepository.updateCredentialCounter).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when verification.verified is false', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-auth',
    });
    mockRepository.findCredentialByCredentialId.mockResolvedValue({
      id: 'db-cred-id',
      userId: 'user-123',
      credentialId: 'cred-id-base64',
      publicKey: 'base64-public-key',
      counter: BigInt(0),
      transports: ['internal'],
      user: { id: 'user-123' },
    });
    mockVerifyAuthenticationResponse.mockResolvedValueOnce({
      verified: false,
      authenticationInfo: {
        newCounter: 0,
        credentialID: 'cred-id',
        userVerified: false,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });

    const handler = createHandler();
    const command = new VerifyAuthenticationCommand('challenge-token', {
      id: 'cred-id-base64',
      rawId: 'raw',
      response: {},
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Authentication verification failed');
    expect(mockRepository.updateCredentialCounter).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
