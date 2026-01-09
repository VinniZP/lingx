/**
 * VerifyAuthenticationHandler
 *
 * Verifies WebAuthn authentication and updates credential counter.
 */
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { UnauthorizedError } from '../../../../plugins/error-handler.js';
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
    private readonly repository: WebAuthnRepository,
    private readonly configService: WebAuthnConfigService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: VerifyAuthenticationCommand): Promise<VerifyAuthenticationResult> {
    // Find the credential by credentialId from the response
    const credential = await this.repository.findCredentialByCredentialId(command.response.id);

    if (!credential) {
      throw new UnauthorizedError('Passkey not found');
    }

    // Verify the authentication response
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: command.response,
        expectedChallenge: command.expectedChallenge,
        expectedOrigin: this.configService.origin,
        expectedRPID: this.configService.rpId,
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
    await this.repository.updateCredentialCounter(
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
