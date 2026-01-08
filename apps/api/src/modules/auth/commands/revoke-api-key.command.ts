import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to revoke an API key.
 */
export class RevokeApiKeyCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    /** ID of the API key to revoke */
    public readonly apiKeyId: string,
    /** User ID who owns the key (for authorization) */
    public readonly userId: string
  ) {}
}
