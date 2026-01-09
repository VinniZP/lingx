/**
 * IsPasswordlessHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IsPasswordlessHandler } from '../webauthn/queries/is-passwordless.handler.js';
import { IsPasswordlessQuery } from '../webauthn/queries/is-passwordless.query.js';

describe('IsPasswordlessHandler', () => {
  let mockRepository: {
    isPasswordless: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      isPasswordless: vi.fn(),
    };
  });

  const createHandler = () => new IsPasswordlessHandler(mockRepository as any);

  it('should return true when user is passwordless', async () => {
    mockRepository.isPasswordless.mockResolvedValue(true);

    const handler = createHandler();
    const query = new IsPasswordlessQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toBe(true);
  });

  it('should return false when user has password', async () => {
    mockRepository.isPasswordless.mockResolvedValue(false);

    const handler = createHandler();
    const query = new IsPasswordlessQuery('user-123');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });
});
