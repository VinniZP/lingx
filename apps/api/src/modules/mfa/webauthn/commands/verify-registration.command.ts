/**
 * VerifyRegistrationCommand
 *
 * Verifies WebAuthn registration response and stores the credential.
 */
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface WebAuthnCredentialInfo {
  id: string;
  name: string;
  createdAt: string;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
}

export interface VerifyRegistrationResult {
  credential: WebAuthnCredentialInfo;
}

export class VerifyRegistrationCommand implements ICommand<VerifyRegistrationResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: VerifyRegistrationResult;

  constructor(
    public readonly userId: string,
    public readonly credentialName: string,
    public readonly challengeToken: string,
    public readonly response: RegistrationResponseJSON
  ) {}
}
