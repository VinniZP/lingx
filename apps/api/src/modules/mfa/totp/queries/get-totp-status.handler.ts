/**
 * GetTotpStatusHandler
 *
 * Returns TOTP status including backup codes and trusted devices count.
 */
import { UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import type { TotpRepository } from '../totp.repository.js';
import { GetTotpStatusQuery, type TotpStatus } from './get-totp-status.query.js';

export class GetTotpStatusHandler implements IQueryHandler<GetTotpStatusQuery> {
  constructor(private readonly totpRepository: TotpRepository) {}

  async execute(query: GetTotpStatusQuery): Promise<TotpStatus> {
    const user = await this.totpRepository.findUserById(query.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.totpEnabled) {
      return {
        enabled: false,
        enabledAt: null,
        backupCodesRemaining: 0,
        trustedDevicesCount: 0,
      };
    }

    // Get counts only when TOTP is enabled
    const [backupCodesRemaining, trustedDevicesCount] = await Promise.all([
      this.totpRepository.countUnusedBackupCodes(query.userId),
      this.totpRepository.countTrustedSessions(query.userId),
    ]);

    return {
      enabled: true,
      enabledAt: user.totpEnabledAt?.toISOString() ?? null,
      backupCodesRemaining,
      trustedDevicesCount,
    };
  }
}
