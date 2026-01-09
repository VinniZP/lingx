/**
 * GenerateRegistrationOptionsCommand
 *
 * Generates WebAuthn registration options for creating a new passkey.
 */
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server';
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface GenerateRegistrationOptionsResult {
  options: PublicKeyCredentialCreationOptionsJSON;
  challenge: string; // Challenge for verification (stored temporarily)
}

export class GenerateRegistrationOptionsCommand implements ICommand<GenerateRegistrationOptionsResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: GenerateRegistrationOptionsResult;

  constructor(public readonly userId: string) {}
}
