/**
 * HasPasskeysHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HasPasskeysHandler } from '../webauthn/queries/has-passkeys.handler.js';
import { HasPasskeysQuery } from '../webauthn/queries/has-passkeys.query.js';

describe('HasPasskeysHandler', () => {
  let mockRepository: {
    findUserByEmail: ReturnType<typeof vi.fn>;
    countCredentials: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserByEmail: vi.fn(),
      countCredentials: vi.fn(),
    };
  });

  const createHandler = () => new HasPasskeysHandler(mockRepository as any);

  it('should return true when user has passkeys', async () => {
    mockRepository.findUserByEmail.mockResolvedValue({ id: 'user-123' });
    mockRepository.countCredentials.mockResolvedValue(2);

    const handler = createHandler();
    const query = new HasPasskeysQuery('test@example.com');

    const result = await handler.execute(query);

    expect(result).toBe(true);
  });

  it('should return false when user has no passkeys', async () => {
    mockRepository.findUserByEmail.mockResolvedValue({ id: 'user-123' });
    mockRepository.countCredentials.mockResolvedValue(0);

    const handler = createHandler();
    const query = new HasPasskeysQuery('test@example.com');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });

  it('should return false when user not found', async () => {
    mockRepository.findUserByEmail.mockResolvedValue(null);

    const handler = createHandler();
    const query = new HasPasskeysQuery('unknown@example.com');

    const result = await handler.execute(query);

    expect(result).toBe(false);
    expect(mockRepository.countCredentials).not.toHaveBeenCalled();
  });
});
