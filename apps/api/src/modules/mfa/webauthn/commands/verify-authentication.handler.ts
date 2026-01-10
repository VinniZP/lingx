/**
 * VerifyAuthenticationHandler
 *
 * Verifies WebAuthn authentication and updates credential counter.
 */
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { BadRequestError, UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ChallengeStore } from '../../../../services/challenge-store.service.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { PasskeyAuthenticatedEvent } from '../../events/passkey-authenticated.event.js';
import type { WebAuthnConfigService } from '../../shared/webauthn-config.service.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import {
  VerifyAuthenticationCommand,
  type VerifyAuthenticationResult,
} from './verify-authentication.command.js';

export class VerifyAuthenticationHandler implements ICommandHandler<VerifyAuthenticationCommand> {
  constructor(
    private readonly webAuthnRepository: WebAuthnRepository,
    private readonly webAuthnConfigService: WebAuthnConfigService,
    private readonly eventBus: IEventBus,
    private readonly challengeStore: ChallengeStore
  ) {}

  async execute(command: VerifyAuthenticationCommand): Promise<VerifyAuthenticationResult> {
    // Consume challenge from store (single use)
    const stored = await this.challengeStore.consume(command.challengeToken);
    if (!stored) {
      throw new BadRequestError('Challenge expired or invalid');
    }

    // Validate purpose
    if (stored.purpose !== 'webauthn-auth') {
      throw new BadRequestError('Invalid challenge token');
    }

    // Find the credential by credentialId from the response
    const credential = await this.webAuthnRepository.findCredentialByCredentialId(
      command.response.id
    );

    if (!credential) {
      throw new UnauthorizedError('Passkey not found');
    }

    // Verify the authentication response
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: command.response,
        expectedChallenge: stored.challenge,
        expectedOrigin: this.webAuthnConfigService.origin,
        expectedRPID: this.webAuthnConfigService.rpId,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: Number(credential.counter),
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch {
      // Don't expose internal WebAuthn library errors to users
      throw new UnauthorizedError('Authentication verification failed');
    }

    if (!verification.verified) {
      throw new UnauthorizedError('Authentication verification failed');
    }

    // Update the counter and last used timestamp
    await this.webAuthnRepository.updateCredentialCounter(
      credential.id,
      BigInt(verification.authenticationInfo.newCounter)
    );

    // Publish event
    await this.eventBus.publish(new PasskeyAuthenticatedEvent(credential.userId, credential.id));

    return {
      userId: credential.userId,
      credentialId: credential.id,
    };
  }
}
