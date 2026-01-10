/**
 * DeleteCredentialHandler
 *
 * Deletes a passkey, with safety check for passwordless users.
 */
import { BadRequestError, NotFoundError } from '../../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../../shared/cqrs/index.js';
import { PasskeyDeletedEvent } from '../../events/passkey-deleted.event.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import {
  DeleteCredentialCommand,
  type DeleteCredentialResult,
} from './delete-credential.command.js';

export class DeleteCredentialHandler implements ICommandHandler<DeleteCredentialCommand> {
  constructor(
    private readonly webAuthnRepository: WebAuthnRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteCredentialCommand): Promise<DeleteCredentialResult> {
    const credential = await this.webAuthnRepository.findCredentialById(
      command.credentialId,
      command.userId
    );

    if (!credential) {
      throw new NotFoundError('Passkey not found');
    }

    // Check if user is passwordless and this is their last passkey
    const user = await this.webAuthnRepository.findUserForPasswordCheck(command.userId);
    const credentialCount = await this.webAuthnRepository.countCredentials(command.userId);

    if (!user?.password && credentialCount <= 1) {
      throw new BadRequestError(
        'Cannot delete your only passkey. You must add a password or another passkey first.'
      );
    }

    // Delete the credential
    await this.webAuthnRepository.deleteCredential(command.credentialId);

    // Publish event
    await this.eventBus.publish(new PasskeyDeletedEvent(command.userId, command.credentialId));

    return { remainingCount: credentialCount - 1 };
  }
}
