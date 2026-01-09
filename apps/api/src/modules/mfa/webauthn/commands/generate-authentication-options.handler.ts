/**
 * GenerateAuthenticationOptionsHandler
 *
 * Generates WebAuthn authentication options. Supports both discoverable credentials
 * (no email) and user-specific credentials (with email).
 */
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { ICommandHandler } from '../../../../shared/cqrs/index.js';
import type { WebAuthnConfigService } from '../../shared/webauthn-config.service.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import {
  GenerateAuthenticationOptionsCommand,
  type GenerateAuthenticationOptionsResult,
} from './generate-authentication-options.command.js';

export class GenerateAuthenticationOptionsHandler implements ICommandHandler<GenerateAuthenticationOptionsCommand> {
  constructor(
    private readonly repository: WebAuthnRepository,
    private readonly configService: WebAuthnConfigService
  ) {}

  async execute(
    command: GenerateAuthenticationOptionsCommand
  ): Promise<GenerateAuthenticationOptionsResult> {
    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;
    let userId: string | undefined;

    // If email is provided, get user's credentials
    if (command.email) {
      const user = await this.repository.findUserByEmail(command.email);

      if (user && user.webauthnCredentials.length > 0) {
        userId = user.id;
        allowCredentials = user.webauthnCredentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as AuthenticatorTransportFuture[],
        }));
      }
    }

    // Generate options (allowCredentials undefined = discoverable credential flow)
    const options = await generateAuthenticationOptions({
      rpID: this.configService.rpId,
      allowCredentials,
      userVerification: 'preferred',
    });

    return {
      options,
      challenge: options.challenge,
      userId,
    };
  }
}
