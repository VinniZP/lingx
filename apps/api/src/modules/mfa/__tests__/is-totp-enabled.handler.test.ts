/**
 * IsTotpEnabledHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IsTotpEnabledHandler } from '../totp/queries/is-totp-enabled.handler.js';
import { IsTotpEnabledQuery } from '../totp/queries/is-totp-enabled.query.js';

describe('IsTotpEnabledHandler', () => {
  let mockRepository: {
    findUserById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
    };
  });

  const createHandler = () => new IsTotpEnabledHandler(mockRepository as any);

  it('should return true when TOTP is enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: true,
    });

    const handler = createHandler();
    const query = new IsTotpEnabledQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toBe(true);
  });

  it('should return false when TOTP is not enabled', async () => {
    mockRepository.findUserById.mockResolvedValue({
      id: 'user-123',
      totpEnabled: false,
    });

    const handler = createHandler();
    const query = new IsTotpEnabledQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });

  it('should return false when user not found', async () => {
    mockRepository.findUserById.mockResolvedValue(null);

    const handler = createHandler();
    const query = new IsTotpEnabledQuery('non-existent');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });
});
