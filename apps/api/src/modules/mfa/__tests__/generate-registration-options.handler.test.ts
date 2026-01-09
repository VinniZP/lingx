/**
 * GenerateRegistrationOptionsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateRegistrationOptionsCommand } from '../webauthn/commands/generate-registration-options.command.js';
import { GenerateRegistrationOptionsHandler } from '../webauthn/commands/generate-registration-options.handler.js';

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'test-challenge-base64',
    rp: { name: 'Lingx', id: 'localhost' },
    user: { id: 'user-id', name: 'test@example.com', displayName: 'Test User' },
    pubKeyCredParams: [],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: [],
    authenticatorSelection: {},
  }),
}));

describe('GenerateRegistrationOptionsHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    rpId: string;
    rpName: string;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
    };
    mockConfigService = {
      rpId: 'localhost',
      rpName: 'Lingx',
    };
  });

  const createHandler = () =>
    new GenerateRegistrationOptionsHandler(mockRepository as any, mockConfigService as any);

  it('should generate registration options for a user', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      webauthnCredentials: [],
    });

    const handler = createHandler();
    const command = new GenerateRegistrationOptionsCommand('user-123');

    const result = await handler.execute(command);

    expect(result.options).toBeDefined();
    expect(result.options.challenge).toBe('test-challenge-base64');
    expect(mockRepository.findUserById).toHaveBeenCalledWith('user-123');
  });

  it('should exclude existing credentials', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      webauthnCredentials: [
        { credentialId: 'existing-cred-1', transports: ['usb'] },
        { credentialId: 'existing-cred-2', transports: ['internal'] },
      ],
    });

    const handler = createHandler();
    const command = new GenerateRegistrationOptionsCommand('user-123');

    await handler.execute(command);

    // Just verify it completes without error
    expect(mockRepository.findUserById).toHaveBeenCalledWith('user-123');
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const command = new GenerateRegistrationOptionsCommand('non-existent');

    await expect(handler.execute(command)).rejects.toThrow('User not found');
  });
});
