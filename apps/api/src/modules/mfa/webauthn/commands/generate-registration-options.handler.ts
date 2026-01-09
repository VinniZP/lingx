/**
 * GenerateRegistrationOptionsHandler
 *
 * Generates WebAuthn registration options using SimpleWebAuthn.
 */
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ICommandHandler } from '../../../../shared/cqrs/index.js';
import type { WebAuthnConfigService } from '../../shared/webauthn-config.service.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import {
  GenerateRegistrationOptionsCommand,
  type GenerateRegistrationOptionsResult,
} from './generate-registration-options.command.js';

export class GenerateRegistrationOptionsHandler implements ICommandHandler<GenerateRegistrationOptionsCommand> {
  constructor(
    private readonly repository: WebAuthnRepository,
    private readonly configService: WebAuthnConfigService
  ) {}

  async execute(
    command: GenerateRegistrationOptionsCommand
  ): Promise<GenerateRegistrationOptionsResult> {
    const user = await this.repository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Get existing credentials to exclude (prevent re-registration)
    const excludeCredentials = user.webauthnCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
      rpName: this.configService.rpName,
      rpID: this.configService.rpId,
      userName: user.email,
      userDisplayName: user.name || user.email,
      userID: new TextEncoder().encode(user.id),
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    return {
      options,
      challenge: options.challenge,
    };
  }
}
