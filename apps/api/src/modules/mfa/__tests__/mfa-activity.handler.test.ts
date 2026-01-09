/**
 * MfaActivityHandler Unit Tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupCodeUsedEvent } from '../events/backup-code-used.event.js';
import { DeviceTrustedEvent } from '../events/device-trusted.event.js';
import { PasskeyRegisteredEvent } from '../events/passkey-registered.event.js';
import { TotpEnabledEvent } from '../events/totp-enabled.event.js';
import { MfaActivityHandler } from '../handlers/mfa-activity.handler.js';

describe('MfaActivityHandler', () => {
  let mockLogger: { info: ReturnType<typeof vi.fn> };
  let handler: MfaActivityHandler;

  beforeEach(() => {
    mockLogger = { info: vi.fn() };
    handler = new MfaActivityHandler(mockLogger as any);
  });

  it('should log TotpEnabledEvent', async () => {
    const event = new TotpEnabledEvent('user-123');

    await handler.handle(event);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TotpEnabledEvent',
        userId: 'user-123',
        occurredAt: expect.any(Date),
      }),
      expect.stringContaining('MFA event')
    );
  });

  it('should log BackupCodeUsedEvent with codes remaining', async () => {
    const event = new BackupCodeUsedEvent('user-123', 5);

    await handler.handle(event);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'BackupCodeUsedEvent',
        userId: 'user-123',
        codesRemaining: 5,
      }),
      expect.stringContaining('MFA event')
    );
  });

  it('should log PasskeyRegisteredEvent with credential info', async () => {
    const event = new PasskeyRegisteredEvent('user-123', 'cred-id', 'My Passkey');

    await handler.handle(event);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PasskeyRegisteredEvent',
        userId: 'user-123',
        credentialId: 'cred-id',
        credentialName: 'My Passkey',
      }),
      expect.stringContaining('MFA event')
    );
  });

  it('should log DeviceTrustedEvent with session info', async () => {
    const event = new DeviceTrustedEvent('user-123', 'session-456');

    await handler.handle(event);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DeviceTrustedEvent',
        userId: 'user-123',
        sessionId: 'session-456',
      }),
      expect.stringContaining('MFA event')
    );
  });
});
