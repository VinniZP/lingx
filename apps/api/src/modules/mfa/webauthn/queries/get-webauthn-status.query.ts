/**
 * GetWebAuthnStatusQuery
 *
 * Retrieves WebAuthn/Passkey status for a user.
 */
import type { IQuery } from '../../../../shared/cqrs/index.js';

export interface WebAuthnStatus {
  hasPasskeys: boolean;
  credentialsCount: number;
  canGoPasswordless: boolean;
  isPasswordless: boolean;
}

export class GetWebAuthnStatusQuery implements IQuery<WebAuthnStatus> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: WebAuthnStatus;

  constructor(public readonly userId: string) {}
}
