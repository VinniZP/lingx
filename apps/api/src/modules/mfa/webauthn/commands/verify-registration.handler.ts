/**
 * VerifyRegistrationHandler
 *
 * Verifies WebAuthn registration and stores the new credential.
 */
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { BadRequestError, UnauthorizedError } from '../../../../plugins/error-handler.js';
import type { ChallengeStore } from '../../../../services/challenge-store.service.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { PasskeyRegisteredEvent } from '../../events/passkey-registered.event.js';
import type { WebAuthnConfigService } from '../../shared/webauthn-config.service.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import {
  VerifyRegistrationCommand,
  type VerifyRegistrationResult,
} from './verify-registration.command.js';

export class VerifyRegistrationHandler implements ICommandHandler<VerifyRegistrationCommand> {
  constructor(
    private readonly repository: WebAuthnRepository,
    private readonly configService: WebAuthnConfigService,
    private readonly eventBus: IEventBus,
    private readonly challengeStore: ChallengeStore
  ) {}

  async execute(command: VerifyRegistrationCommand): Promise<VerifyRegistrationResult> {
    // Consume challenge from store (single use)
    const stored = await this.challengeStore.consume(command.challengeToken);
    if (!stored) {
      throw new BadRequestError('Challenge expired or invalid');
    }

    // Validate purpose and userId
    if (stored.purpose !== 'webauthn-register' || stored.userId !== command.userId) {
      throw new BadRequestError('Invalid challenge token');
    }

    const user = await this.repository.findUserById(command.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify the registration response
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: command.response,
        expectedChallenge: stored.challenge,
        expectedOrigin: this.configService.origin,
        expectedRPID: this.configService.rpId,
      });
    } catch {
      // Don't expose internal WebAuthn library errors to users
      throw new BadRequestError('Registration verification failed');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestError('Registration verification failed');
    }

    const { registrationInfo } = verification;

    // Store the credential
    const credential = await this.repository.createCredential({
      userId: command.userId,
      credentialId: registrationInfo.credential.id,
      publicKey: Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
      counter: BigInt(registrationInfo.credential.counter),
      transports: (command.response.response.transports || []) as string[],
      deviceType: registrationInfo.credentialDeviceType,
      backedUp: registrationInfo.credentialBackedUp,
      aaguid: registrationInfo.aaguid,
      name: command.credentialName,
    });

    // Publish event
    await this.eventBus.publish(
      new PasskeyRegisteredEvent(command.userId, credential.id, command.credentialName)
    );

    return {
      credential: {
        id: credential.id,
        name: credential.name,
        createdAt: credential.createdAt.toISOString(),
        deviceType: credential.deviceType as 'singleDevice' | 'multiDevice',
        backedUp: credential.backedUp,
      },
    };
  }
}
