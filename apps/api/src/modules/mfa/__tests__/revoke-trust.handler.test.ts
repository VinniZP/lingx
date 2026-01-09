/**
 * RevokeTrustHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RevokeTrustCommand } from '../device-trust/commands/revoke-trust.command.js';
import { RevokeTrustHandler } from '../device-trust/commands/revoke-trust.handler.js';
import { DeviceTrustRevokedEvent } from '../events/device-trust-revoked.event.js';

describe('RevokeTrustHandler', () => {
  let mockRepository: {
    revokeSessionTrust: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      revokeSessionTrust: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () => new RevokeTrustHandler(mockRepository as any, mockEventBus as any);

  it('should revoke session trust', async () => {
    const handler = createHandler();
    const command = new RevokeTrustCommand('session-123', 'user-123');

    await handler.execute(command);

    expect(mockRepository.revokeSessionTrust).toHaveBeenCalledWith('session-123', 'user-123');
  });

  it('should publish DeviceTrustRevokedEvent', async () => {
    const handler = createHandler();
    const command = new RevokeTrustCommand('session-123', 'user-123');

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(DeviceTrustRevokedEvent));
    const event = mockEventBus.publish.mock.calls[0][0] as DeviceTrustRevokedEvent;
    expect(event.userId).toBe('user-123');
    expect(event.sessionId).toBe('session-123');
  });

  it('should propagate repository errors', async () => {
    mockRepository.revokeSessionTrust.mockRejectedValue(new Error('Database error'));
    const handler = createHandler();
    const command = new RevokeTrustCommand('session-123', 'user-123');

    await expect(handler.execute(command)).rejects.toThrow('Database error');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
