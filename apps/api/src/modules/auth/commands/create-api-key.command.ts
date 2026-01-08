import type { ApiKeyWithFullKey } from '../../../services/api-key.service.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to create a new API key.
 * Returns the full key (shown only once) and API key metadata.
 */
export class CreateApiKeyCommand implements ICommand<ApiKeyWithFullKey> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ApiKeyWithFullKey;

  constructor(
    /** Name/description for the API key */
    public readonly name: string,
    /** User ID who owns the key */
    public readonly userId: string
  ) {}
}
