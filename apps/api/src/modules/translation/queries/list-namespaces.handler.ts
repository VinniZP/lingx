import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { ListNamespacesQuery } from './list-namespaces.query.js';

/**
 * Handler for ListNamespacesQuery.
 * Lists unique namespaces with key counts for a branch.
 *
 * Authorization: Requires project membership via branch access.
 */
export class ListNamespacesHandler implements IQueryHandler<ListNamespacesQuery> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ListNamespacesQuery): Promise<InferQueryResult<ListNamespacesQuery>> {
    const { branchId, userId } = query;

    // Verify user has access to the branch
    await this.accessService.verifyBranchAccess(userId, branchId);

    // Fetch namespaces from repository
    return this.translationRepository.getNamespaces(branchId);
  }
}
