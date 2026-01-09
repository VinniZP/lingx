/**
 * RevokeTrustHandler
 *
 * Handles the RevokeTrustCommand by clearing session trust.
 */
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { DeviceTrustRevokedEvent } from '../../events/device-trust-revoked.event.js';
import type { TotpRepository } from '../../totp/totp.repository.js';
import { RevokeTrustCommand } from './revoke-trust.command.js';

export class RevokeTrustHandler implements ICommandHandler<RevokeTrustCommand> {
  constructor(
    private readonly repository: TotpRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RevokeTrustCommand): Promise<void> {
    await this.repository.revokeSessionTrust(command.sessionId, command.userId);

    await this.eventBus.publish(new DeviceTrustRevokedEvent(command.userId, command.sessionId));
  }
}
