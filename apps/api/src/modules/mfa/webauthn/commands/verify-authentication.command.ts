/**
 * VerifyAuthenticationCommand
 *
 * Verifies WebAuthn authentication response and returns authenticated user.
 */
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface VerifyAuthenticationResult {
  userId: string;
  credentialId: string;
}

export class VerifyAuthenticationCommand implements ICommand<VerifyAuthenticationResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: VerifyAuthenticationResult;

  constructor(
    public readonly challengeToken: string,
    public readonly response: AuthenticationResponseJSON
  ) {}
}
