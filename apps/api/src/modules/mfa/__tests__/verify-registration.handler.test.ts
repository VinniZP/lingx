/**
 * VerifyRegistrationHandler Unit Tests
 */
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeyRegisteredEvent } from '../events/passkey-registered.event.js';
import { VerifyRegistrationCommand } from '../webauthn/commands/verify-registration.command.js';
import { VerifyRegistrationHandler } from '../webauthn/commands/verify-registration.handler.js';

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: 'credential-id-base64',
        publicKey: new Uint8Array([1, 2, 3, 4]),
        counter: 0,
      },
      credentialDeviceType: 'multiDevice',
      credentialBackedUp: true,
      aaguid: '00000000-0000-0000-0000-000000000000',
    },
  }),
}));

const mockVerifyRegistrationResponse = vi.mocked(verifyRegistrationResponse);

describe('VerifyRegistrationHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
    createCredential: ReturnType<typeof vi.fn>;
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
      findUserById: vi.fn(),
      createCredential: vi.fn(),
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
    new VerifyRegistrationHandler(
      mockRepository as any,
      mockConfigService as any,
      mockEventBus as any,
      mockChallengeStore as any
    );

  it('should verify registration and store credential', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-register',
      userId: 'user-123',
    });
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      webauthnCredentials: [],
    });
    mockRepository.createCredential.mockResolvedValue({
      id: 'db-credential-id',
      name: 'My Passkey',
      createdAt: new Date(),
      lastUsedAt: null,
      deviceType: 'multiDevice',
      backedUp: true,
    });

    const handler = createHandler();
    const command = new VerifyRegistrationCommand('user-123', 'My Passkey', 'challenge-token', {
      id: 'test',
      rawId: 'test',
      response: { clientDataJSON: '', attestationObject: '' },
      type: 'public-key',
    } as any);

    const result = await handler.execute(command);

    expect(result.credential.name).toBe('My Passkey');
    expect(mockChallengeStore.consume).toHaveBeenCalledWith('challenge-token');
    expect(mockRepository.createCredential).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(PasskeyRegisteredEvent));
  });

  it('should throw BadRequestError when challenge expired', async () => {
    mockChallengeStore.consume.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyRegistrationCommand(
      'user-123',
      'My Passkey',
      'expired-token',
      {} as any
    );

    await expect(handler.execute(command)).rejects.toThrow('Challenge expired or invalid');
  });

  it('should throw BadRequestError when userId mismatch', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-register',
      userId: 'different-user',
    });

    const handler = createHandler();
    const command = new VerifyRegistrationCommand(
      'user-123',
      'My Passkey',
      'challenge-token',
      {} as any
    );

    await expect(handler.execute(command)).rejects.toThrow('Invalid challenge token');
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-register',
      userId: 'non-existent',
    });
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyRegistrationCommand(
      'non-existent',
      'My Passkey',
      'challenge-token',
      {} as any
    );

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });

  it('should throw BadRequestError when WebAuthn library throws an error', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-register',
      userId: 'user-123',
    });
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      webauthnCredentials: [],
    });
    mockVerifyRegistrationResponse.mockRejectedValueOnce(new Error('Invalid attestation'));

    const handler = createHandler();
    const command = new VerifyRegistrationCommand('user-123', 'My Passkey', 'challenge-token', {
      id: 'test',
      rawId: 'test',
      response: { clientDataJSON: '', attestationObject: '' },
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Registration verification failed');
    expect(mockRepository.createCredential).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError when verification.verified is false', async () => {
    mockChallengeStore.consume.mockResolvedValue({
      challenge: 'test-challenge',
      purpose: 'webauthn-register',
      userId: 'user-123',
    });
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      webauthnCredentials: [],
    });
    mockVerifyRegistrationResponse.mockResolvedValueOnce({
      verified: false,
      registrationInfo: undefined,
    });

    const handler = createHandler();
    const command = new VerifyRegistrationCommand('user-123', 'My Passkey', 'challenge-token', {
      id: 'test',
      rawId: 'test',
      response: { clientDataJSON: '', attestationObject: '' },
      type: 'public-key',
    } as any);

    await expect(handler.execute(command)).rejects.toThrow('Registration verification failed');
    expect(mockRepository.createCredential).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
