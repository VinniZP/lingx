import { createHash, randomBytes } from 'crypto';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ApiKeyCreatedEvent } from '../events/api-key-created.event.js';
import type { ApiKeyRepository, ApiKeyWithoutHash } from '../repositories/api-key.repository.js';
import type { CreateApiKeyCommand } from './create-api-key.command.js';

/** Prefix for Lingx API keys */
const KEY_PREFIX = 'lf_';
/** Length of random bytes for key generation (32 bytes = 64 hex characters) */
const KEY_LENGTH = 32;

export interface ApiKeyWithFullKey {
  key: string;
  apiKey: ApiKeyWithoutHash;
}

/**
 * Handler for CreateApiKeyCommand.
 * Generates API key, stores hash via repository, and publishes event.
 */
export class CreateApiKeyHandler implements ICommandHandler<CreateApiKeyCommand> {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<InferCommandResult<CreateApiKeyCommand>> {
    // Generate random key
    const randomPart = randomBytes(KEY_LENGTH).toString('hex');
    const fullKey = `${KEY_PREFIX}${randomPart}`;

    // Hash for storage
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.substring(0, 11); // "lf_" + first 8 chars

    // Create API key via repository
    const apiKey = await this.apiKeyRepository.create({
      name: command.name,
      userId: command.userId,
      keyHash,
      keyPrefix,
    });

    // Publish event
    await this.eventBus.publish(new ApiKeyCreatedEvent(command.userId, apiKey.id));

    // Return full key (shown once) and API key metadata
    return {
      key: fullKey,
      apiKey,
    };
  }
}
