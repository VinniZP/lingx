import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ApiKeyRepository } from '../repositories/api-key.repository.js';
import type { ListApiKeysQuery } from './list-api-keys.query.js';

/**
 * Handler for ListApiKeysQuery.
 * Lists all active API keys for a user via repository.
 */
export class ListApiKeysHandler implements IQueryHandler<ListApiKeysQuery> {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async execute(query: ListApiKeysQuery): Promise<InferQueryResult<ListApiKeysQuery>> {
    return this.apiKeyRepository.findByUserId(query.userId);
  }
}
