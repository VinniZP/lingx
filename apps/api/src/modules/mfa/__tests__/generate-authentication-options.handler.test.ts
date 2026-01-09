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

  beforeEach(() => {
    mockRepository = {
      findUserByEmail: vi.fn(),
    };
    mockConfigService = {
      rpId: 'localhost',
    };
  });

  const createHandler = () =>
    new GenerateAuthenticationOptionsHandler(mockRepository as any, mockConfigService as any);

  it('should generate authentication options without email (discoverable)', async () => {
    const handler = createHandler();
    const command = new GenerateAuthenticationOptionsCommand();

    const result = await handler.execute(command);

    expect(result.options).toBeDefined();
    expect(result.options.challenge).toBe('auth-challenge-base64');
    expect(result.userId).toBeUndefined();
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
    expect(result.userId).toBe('user-123');
  });

  it('should return undefined userId when user not found', async () => {
    mockRepository.findUserByEmail.mockResolvedValue(null);

    const handler = createHandler();
    const command = new GenerateAuthenticationOptionsCommand('unknown@example.com');

    const result = await handler.execute(command);

    expect(result.userId).toBeUndefined();
  });
});
