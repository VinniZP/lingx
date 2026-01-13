import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { ListBranchesQuery } from './list-branches.query.js';

/**
 * Handler for ListBranchesQuery.
 * Lists all branches for a space after verifying user access.
 */
export class ListBranchesHandler implements IQueryHandler<ListBranchesQuery> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ListBranchesQuery): Promise<InferQueryResult<ListBranchesQuery>> {
    const { spaceId, userId } = query;

    // Get project ID from space
    const projectId = await this.branchRepository.getProjectIdBySpaceId(spaceId);
    if (!projectId) {
      throw new NotFoundError('Space');
    }

    // Verify user has access to the project
    await this.accessService.verifyProjectAccess(userId, projectId);

    // Return branches for the space
    return this.branchRepository.findBySpaceId(spaceId);
  }
}
