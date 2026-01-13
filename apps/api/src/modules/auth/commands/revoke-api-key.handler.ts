import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ApiKeyRevokedEvent } from '../events/api-key-revoked.event.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';
import type { RevokeApiKeyCommand } from './revoke-api-key.command.js';

/**
 * Handler for RevokeApiKeyCommand.
 * Verifies ownership, revokes API key, and publishes event.
 */
export class RevokeApiKeyHandler implements ICommandHandler<RevokeApiKeyCommand> {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<InferCommandResult<RevokeApiKeyCommand>> {
    // Verify ownership
    const apiKey = await this.apiKeyRepository.findByIdAndUserId(command.apiKeyId, command.userId);

    if (!apiKey) {
      throw new NotFoundError('API key');
    }

    // Revoke the API key
    await this.apiKeyRepository.revoke(command.apiKeyId);

    // Publish event
    await this.eventBus.publish(new ApiKeyRevokedEvent(command.userId, command.apiKeyId));
  }
}
