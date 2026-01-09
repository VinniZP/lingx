/**
 * GenerateAuthenticationOptionsHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateAuthenticationOptionsCommand } from '../webauthn/commands/generate-authentication-options.command.js';
import { GenerateAuthenticationOptionsHandler } from '../webauthn/commands/generate-authentication-options.handler.js';

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'auth-challenge-base64',
    timeout: 60000,
    rpId: 'localhost',
    allowCredentials: [],
    userVerification: 'preferred',
  }),
}));

describe('GenerateAuthenticationOptionsHandler', () => {
  let mockRepository: {
    findUserByEmail: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    rpId: string;
  };
  let mockChallengeStore: {
    store: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserByEmail: vi.fn(),
    };
    mockConfigService = {
      rpId: 'localhost',
    };
    mockChallengeStore = {
      store: vi.fn(),
    };
    mockLogger = {
      error: vi.fn(),
    };
  });

  const createHandler = () =>
    new GenerateAuthenticationOptionsHandler(
      mockRepository as any,
      mockConfigService as any,
      mockChallengeStore as any,
      mockLogger as any
    );

  it('should generate authentication options without email (discoverable)', async () => {
    const handler = createHandler();
    const command = new GenerateAuthenticationOptionsCommand();

    const result = await handler.execute(command);

    expect(result.options).toBeDefined();
    expect(result.options.challenge).toBe('auth-challenge-base64');
    expect(result.challengeToken).toBeDefined();
    expect(mockChallengeStore.store).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        challenge: 'auth-challenge-base64',
        purpose: 'webauthn-auth',
      })
    );
  });

  it('should generate authentication options with user credentials', async () => {
    mockRepository.findUserByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      webauthnCredentials: [{ credentialId: 'cred-1', transports: ['internal'] }],
    });

    const handler = createHandler();
    const command = new GenerateAuthenticationOptionsCommand('test@example.com');

    const result = await handler.execute(command);

    expect(result.options).toBeDefined();
    expect(result.challengeToken).toBeDefined();
    // userId is now stored in challengeStore, not returned directly
    expect(mockChallengeStore.store).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        challenge: 'auth-challenge-base64',
        purpose: 'webauthn-auth',
        userId: 'user-123',
      })
    );
  });

  it('should store undefined userId when user not found', async () => {
    mockRepository.findUserByEmail.mockResolvedValue(null);

    const handler = createHandler();
    const command = new GenerateAuthenticationOptionsCommand('unknown@example.com');

    const result = await handler.execute(command);

    expect(result.challengeToken).toBeDefined();
    // userId is undefined when user not found
    expect(mockChallengeStore.store).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        challenge: 'auth-challenge-base64',
        purpose: 'webauthn-auth',
        userId: undefined,
      })
    );
  });

  it('should throw AppError and log when challengeStore.store() fails', async () => {
    mockChallengeStore.store.mockRejectedValue(new Error('Redis connection failed'));

    const handler = createHandler();
    const command = new GenerateAuthenticationOptionsCommand();

    await expect(handler.execute(command)).rejects.toThrow(
      'Failed to initiate passkey authentication'
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: 'Redis connection failed', email: undefined },
      'Failed to store WebAuthn authentication challenge'
    );
  });
});
