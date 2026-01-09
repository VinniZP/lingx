/**
 * IsDeviceTrustedHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IsDeviceTrustedHandler } from '../device-trust/queries/is-device-trusted.handler.js';
import { IsDeviceTrustedQuery } from '../device-trust/queries/is-device-trusted.query.js';

describe('IsDeviceTrustedHandler', () => {
  let mockRepository: {
    getSessionTrust: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      getSessionTrust: vi.fn(),
    };
  });

  const createHandler = () => new IsDeviceTrustedHandler(mockRepository as any);

  it('should return true when session has valid future trust date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15); // 15 days from now
    mockRepository.getSessionTrust.mockResolvedValue({ trustedUntil: futureDate });

    const handler = createHandler();
    const query = new IsDeviceTrustedQuery('session-123');

    const result = await handler.execute(query);

    expect(mockRepository.getSessionTrust).toHaveBeenCalledWith('session-123');
    expect(result).toBe(true);
  });

  it('should return false when session has expired trust date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday
    mockRepository.getSessionTrust.mockResolvedValue({ trustedUntil: pastDate });

    const handler = createHandler();
    const query = new IsDeviceTrustedQuery('session-123');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });

  it('should return false when session has no trust date', async () => {
    mockRepository.getSessionTrust.mockResolvedValue({ trustedUntil: null });

    const handler = createHandler();
    const query = new IsDeviceTrustedQuery('session-123');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });

  it('should return false when session not found', async () => {
    mockRepository.getSessionTrust.mockResolvedValue(null);

    const handler = createHandler();
    const query = new IsDeviceTrustedQuery('non-existent');

    const result = await handler.execute(query);

    expect(result).toBe(false);
  });
});
