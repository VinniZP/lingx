import type { ApiKeyService } from '../../../services/api-key.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ApiKeyCreatedEvent } from '../events/api-key-created.event.js';
import type { CreateApiKeyCommand } from './create-api-key.command.js';

/**
 * Handler for CreateApiKeyCommand.
 * Creates API key and publishes ApiKeyCreatedEvent.
 */
export class CreateApiKeyHandler implements ICommandHandler<CreateApiKeyCommand> {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<InferCommandResult<CreateApiKeyCommand>> {
    const result = await this.apiKeyService.create({
      name: command.name,
      userId: command.userId,
    });

    await this.eventBus.publish(new ApiKeyCreatedEvent(command.userId, result.apiKey.id));

    return result;
  }
}
