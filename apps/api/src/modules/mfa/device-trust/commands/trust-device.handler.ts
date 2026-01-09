/**
 * TrustDeviceHandler
 *
 * Handles the TrustDeviceCommand by setting session trust expiry.
 */
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { DeviceTrustedEvent } from '../../events/device-trusted.event.js';
import { DEVICE_TRUST_DAYS } from '../../shared/constants.js';
import type { TotpRepository } from '../../totp/totp.repository.js';
import { TrustDeviceCommand } from './trust-device.command.js';

export class TrustDeviceHandler implements ICommandHandler<TrustDeviceCommand> {
  constructor(
    private readonly repository: TotpRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: TrustDeviceCommand): Promise<void> {
    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + DEVICE_TRUST_DAYS);

    try {
      await this.repository.setSessionTrust(command.sessionId, trustedUntil);
    } catch (err) {
      // Session may have been revoked or not exist - gracefully handle
      // P2025 = Prisma "Record not found" error
      const isPrismaNotFound =
        err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2025';
      if (!isPrismaNotFound) {
        throw err;
      }
      // Session not found - silently skip (don't break the flow)
      return;
    }

    await this.eventBus.publish(new DeviceTrustedEvent(command.userId, command.sessionId));
  }
}
