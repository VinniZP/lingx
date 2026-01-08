import type { ApiKeyService } from '../../../services/api-key.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { ListApiKeysQuery } from './list-api-keys.query.js';

/**
 * Handler for ListApiKeysQuery.
 * Lists all active API keys for a user.
 */
export class ListApiKeysHandler implements IQueryHandler<ListApiKeysQuery> {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async execute(query: ListApiKeysQuery): Promise<InferQueryResult<ListApiKeysQuery>> {
    return this.apiKeyService.list(query.userId);
  }
}
