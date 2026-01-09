/**
 * GetWebAuthnCredentialsHandler
 *
 * Returns list of all credentials for a user.
 */
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import {
  GetWebAuthnCredentialsQuery,
  type GetWebAuthnCredentialsResult,
} from './get-webauthn-credentials.query.js';

export class GetWebAuthnCredentialsHandler implements IQueryHandler<GetWebAuthnCredentialsQuery> {
  constructor(private readonly repository: WebAuthnRepository) {}

  async execute(query: GetWebAuthnCredentialsQuery): Promise<GetWebAuthnCredentialsResult> {
    const credentials = await this.repository.listCredentials(query.userId);

    return {
      credentials: credentials.map((cred) => ({
        id: cred.id,
        name: cred.name,
        createdAt: cred.createdAt.toISOString(),
        lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
        deviceType: cred.deviceType as 'singleDevice' | 'multiDevice',
        backedUp: cred.backedUp,
      })),
    };
  }
}
