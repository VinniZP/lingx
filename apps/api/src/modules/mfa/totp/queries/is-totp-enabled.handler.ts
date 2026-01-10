/**
 * IsTotpEnabledHandler
 *
 * Simple check for TOTP enabled status. Returns false if user not found.
 */
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import type { TotpRepository } from '../totp.repository.js';
import { IsTotpEnabledQuery } from './is-totp-enabled.query.js';

export class IsTotpEnabledHandler implements IQueryHandler<IsTotpEnabledQuery> {
  constructor(private readonly totpRepository: TotpRepository) {}

  async execute(query: IsTotpEnabledQuery): Promise<boolean> {
    const user = await this.totpRepository.findUserById(query.userId);
    return user?.totpEnabled ?? false;
  }
}
