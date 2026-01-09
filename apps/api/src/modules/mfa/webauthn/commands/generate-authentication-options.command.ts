/**
 * GenerateAuthenticationOptionsCommand
 *
 * Generates WebAuthn authentication options for signing in with a passkey.
 */
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface GenerateAuthenticationOptionsResult {
  options: PublicKeyCredentialRequestOptionsJSON;
  challenge: string;
  userId?: string; // Set if email was provided and user found
}

export class GenerateAuthenticationOptionsCommand implements ICommand<GenerateAuthenticationOptionsResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: GenerateAuthenticationOptionsResult;

  constructor(public readonly email?: string) {}
}
