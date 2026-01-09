/**
 * TrustDeviceHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrustDeviceCommand } from '../device-trust/commands/trust-device.command.js';
import { TrustDeviceHandler } from '../device-trust/commands/trust-device.handler.js';
import { DeviceTrustedEvent } from '../events/device-trusted.event.js';

describe('TrustDeviceHandler', () => {
  let mockRepository: {
    setSessionTrust: ReturnType<typeof vi.fn>;
  };
  let mockEventBus: {
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      setSessionTrust: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
  });

  const createHandler = () => new TrustDeviceHandler(mockRepository as any, mockEventBus as any);

  it('should set session trust for 30 days', async () => {
    const handler = createHandler();
    const command = new TrustDeviceCommand('session-123', 'user-123');

    await handler.execute(command);

    expect(mockRepository.setSessionTrust).toHaveBeenCalledWith('session-123', expect.any(Date));

    // Verify trust date is approximately 30 days from now
    const [sessionId, trustDate] = mockRepository.setSessionTrust.mock.calls[0];
    expect(sessionId).toBe('session-123');
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 30);
    // Allow 1 second tolerance
    expect(trustDate.getTime()).toBeCloseTo(expectedDate.getTime(), -3);
  });

  it('should publish DeviceTrustedEvent', async () => {
    const handler = createHandler();
    const command = new TrustDeviceCommand('session-123', 'user-123');

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(DeviceTrustedEvent));
    const event = mockEventBus.publish.mock.calls[0][0] as DeviceTrustedEvent;
    expect(event.userId).toBe('user-123');
    expect(event.sessionId).toBe('session-123');
  });

  it('should propagate repository errors', async () => {
    mockRepository.setSessionTrust.mockRejectedValue(new Error('Session not found'));
    const handler = createHandler();
    const command = new TrustDeviceCommand('session-123', 'user-123');

    await expect(handler.execute(command)).rejects.toThrow('Session not found');
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
