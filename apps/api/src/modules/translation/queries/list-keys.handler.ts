import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { ListKeysQuery } from './list-keys.query.js';

/**
 * Handler for ListKeysQuery.
 * Lists translation keys with pagination, search, and filters.
 *
 * Authorization: Requires project membership via branch access.
 */
export class ListKeysHandler implements IQueryHandler<ListKeysQuery> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ListKeysQuery): Promise<InferQueryResult<ListKeysQuery>> {
    const { branchId, userId, options } = query;

    // Verify user has access to the branch
    await this.accessService.verifyBranchAccess(userId, branchId);

    // Fetch keys from repository
    return this.translationRepository.findKeysByBranchId(branchId, {
      page: options.page,
      limit: options.limit,
      search: options.search,
      filter: options.filter,
      qualityFilter: options.qualityFilter,
      namespace: options.namespace,
    });
  }
}
