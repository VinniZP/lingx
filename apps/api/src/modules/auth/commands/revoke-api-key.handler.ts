import type { ApiKeyService } from '../../../services/api-key.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ApiKeyRevokedEvent } from '../events/api-key-revoked.event.js';
import type { RevokeApiKeyCommand } from './revoke-api-key.command.js';

/**
 * Handler for RevokeApiKeyCommand.
 * Revokes API key and publishes ApiKeyRevokedEvent.
 */
export class RevokeApiKeyHandler implements ICommandHandler<RevokeApiKeyCommand> {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<InferCommandResult<RevokeApiKeyCommand>> {
    await this.apiKeyService.revoke(command.apiKeyId, command.userId);

    await this.eventBus.publish(new ApiKeyRevokedEvent(command.userId, command.apiKeyId));
  }
}
