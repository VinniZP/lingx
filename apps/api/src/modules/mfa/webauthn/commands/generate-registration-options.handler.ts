/**
 * GenerateRegistrationOptionsHandler
 *
 * Generates WebAuthn registration options using SimpleWebAuthn.
 */
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { randomBytes } from 'crypto';
import type { FastifyBaseLogger } from 'fastify';
import { AppError, UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ChallengeStore } from '../../../../services/challenge-store.service.js';
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
    private readonly configService: WebAuthnConfigService,
    private readonly challengeStore: ChallengeStore,
    private readonly logger: FastifyBaseLogger
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

    // Generate secure token and store challenge
    const challengeToken = randomBytes(32).toString('base64url');
    try {
      await this.challengeStore.store(challengeToken, {
        challenge: options.challenge,
        purpose: 'webauthn-register',
        userId: command.userId,
      });
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error', userId: command.userId },
        'Failed to store WebAuthn registration challenge'
      );
      throw new AppError('Failed to initiate passkey registration', 500, 'CHALLENGE_STORE_ERROR');
    }

    return {
      options,
      challengeToken,
    };
  }
}
