/**
 * GetWebAuthnStatusHandler
 *
 * Returns WebAuthn status including credentials count and passwordless status.
 */
import { UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import { MIN_PASSKEYS_FOR_PASSWORDLESS } from '../../shared/constants.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import { GetWebAuthnStatusQuery, type WebAuthnStatus } from './get-webauthn-status.query.js';

export class GetWebAuthnStatusHandler implements IQueryHandler<GetWebAuthnStatusQuery> {
  constructor(private readonly webAuthnRepository: WebAuthnRepository) {}

  async execute(query: GetWebAuthnStatusQuery): Promise<WebAuthnStatus> {
    const user = await this.webAuthnRepository.findUserForPasswordCheck(query.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const credentialsCount = await this.webAuthnRepository.countCredentials(query.userId);

    return {
      hasPasskeys: credentialsCount > 0,
      credentialsCount,
      canGoPasswordless: credentialsCount >= MIN_PASSKEYS_FOR_PASSWORDLESS,
      isPasswordless: user.password === null,
    };
  }
}
