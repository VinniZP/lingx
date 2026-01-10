/**
 * HasPasskeysHandler
 *
 * Checks if user has passkeys by email (for login flow).
 */
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import { HasPasskeysQuery } from './has-passkeys.query.js';

export class HasPasskeysHandler implements IQueryHandler<HasPasskeysQuery> {
  constructor(private readonly webAuthnRepository: WebAuthnRepository) {}

  async execute(query: HasPasskeysQuery): Promise<boolean> {
    const user = await this.webAuthnRepository.findUserByEmail(query.email);

    if (!user) {
      return false;
    }

    const count = await this.webAuthnRepository.countCredentials(user.id);
    return count > 0;
  }
}
