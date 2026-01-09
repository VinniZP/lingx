/**
 * GetWebAuthnCredentialsQuery
 *
 * Retrieves list of WebAuthn credentials for a user.
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export interface WebAuthnCredentialInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
}

export interface GetWebAuthnCredentialsResult {
  credentials: WebAuthnCredentialInfo[];
}

export class GetWebAuthnCredentialsQuery implements IQuery<GetWebAuthnCredentialsResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetWebAuthnCredentialsResult;

  constructor(public readonly userId: string) {}
}
