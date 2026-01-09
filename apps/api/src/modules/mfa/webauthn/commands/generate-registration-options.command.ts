/**
 * GenerateRegistrationOptionsCommand
 *
 * Generates WebAuthn registration options for creating a new passkey.
 */
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server';
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface GenerateRegistrationOptionsResult {
  options: PublicKeyCredentialCreationOptionsJSON;
  challengeToken: string; // Token to retrieve challenge during verification
}

export class GenerateRegistrationOptionsCommand implements ICommand<GenerateRegistrationOptionsResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: GenerateRegistrationOptionsResult;

  constructor(public readonly userId: string) {}
}
