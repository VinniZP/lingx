/**
 * VerifyRegistrationHandler Unit Tests
 */
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
  });

  const createHandler = () =>
    new VerifyRegistrationHandler(
      mockRepository as any,
      mockConfigService as any,
      mockEventBus as any
    );

  it('should verify registration and store credential', async () => {
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
    const command = new VerifyRegistrationCommand('user-123', 'My Passkey', 'test-challenge', {
      id: 'test',
      rawId: 'test',
      response: { clientDataJSON: '', attestationObject: '' },
      type: 'public-key',
    } as any);

    const result = await handler.execute(command);

    expect(result.credential.name).toBe('My Passkey');
    expect(mockRepository.createCredential).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(PasskeyRegisteredEvent));
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new VerifyRegistrationCommand(
      'non-existent',
      'My Passkey',
      'test-challenge',
      {} as any
    );

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });
});
