import type { ApiKey } from '@prisma/client';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * API key without the hash (safe to return)
 */
export type ApiKeyWithoutHash = Omit<ApiKey, 'keyHash'>;

/**
 * Query to list all active API keys for a user.
 */
export class ListApiKeysQuery implements IQuery<ApiKeyWithoutHash[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ApiKeyWithoutHash[];

  constructor(
    /** User ID to list keys for */
    public readonly userId: string
  ) {}
}
