/**
 * IsDeviceTrustedHandler
 *
 * Handles the IsDeviceTrustedQuery by checking session trust status.
 */
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import type { TotpRepository } from '../../totp/totp.repository.js';
import { IsDeviceTrustedQuery } from './is-device-trusted.query.js';

export class IsDeviceTrustedHandler implements IQueryHandler<IsDeviceTrustedQuery> {
  constructor(private readonly totpRepository: TotpRepository) {}

  async execute(query: IsDeviceTrustedQuery): Promise<boolean> {
    const session = await this.totpRepository.getSessionTrust(query.sessionId);

    if (!session || !session.trustedUntil) {
      return false;
    }

    return session.trustedUntil > new Date();
  }
}
