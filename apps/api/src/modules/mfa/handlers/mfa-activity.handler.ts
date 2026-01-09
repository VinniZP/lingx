/**
 * MfaActivityHandler
 *
 * Event handler for MFA-related activity logging.
 * Processes all MFA events and logs them for audit purposes.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';

// Import all MFA event types for type union
import type { BackupCodeUsedEvent } from '../events/backup-code-used.event.js';
import type { BackupCodesRegeneratedEvent } from '../events/backup-codes-regenerated.event.js';
import type { DeviceTrustRevokedEvent } from '../events/device-trust-revoked.event.js';
import type { DeviceTrustedEvent } from '../events/device-trusted.event.js';
import type { PasskeyAuthenticatedEvent } from '../events/passkey-authenticated.event.js';
import type { PasskeyDeletedEvent } from '../events/passkey-deleted.event.js';
import type { PasskeyRegisteredEvent } from '../events/passkey-registered.event.js';
import type { TotpDisabledEvent } from '../events/totp-disabled.event.js';
import type { TotpEnabledEvent } from '../events/totp-enabled.event.js';
import type { TotpVerifiedEvent } from '../events/totp-verified.event.js';
import type { WentPasswordlessEvent } from '../events/went-passwordless.event.js';

type MfaEvent =
  | TotpEnabledEvent
  | TotpDisabledEvent
  | TotpVerifiedEvent
  | BackupCodeUsedEvent
  | BackupCodesRegeneratedEvent
  | PasskeyRegisteredEvent
  | PasskeyAuthenticatedEvent
  | PasskeyDeletedEvent
  | WentPasswordlessEvent
  | DeviceTrustedEvent
  | DeviceTrustRevokedEvent;

export class MfaActivityHandler implements IEventHandler<MfaEvent> {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(event: IEvent): Promise<void> {
    // Log MFA events for audit trail
    this.logger.info(
      {
        eventType: event.constructor.name,
        occurredAt: event.occurredAt,
        ...this.extractEventData(event),
      },
      `MFA event: ${event.constructor.name}`
    );
  }

  /**
   * Extract relevant data from MFA events for logging.
   */
  private extractEventData(event: IEvent): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Common fields
    if ('userId' in event) {
      data.userId = event.userId;
    }

    // TOTP-specific fields
    if ('codesRemaining' in event) {
      data.codesRemaining = event.codesRemaining;
    }

    // WebAuthn-specific fields
    if ('credentialId' in event) {
      data.credentialId = event.credentialId;
    }
    if ('credentialName' in event) {
      data.credentialName = event.credentialName;
    }

    // Session/Device trust fields
    if ('sessionId' in event) {
      data.sessionId = event.sessionId;
    }

    return data;
  }
}
