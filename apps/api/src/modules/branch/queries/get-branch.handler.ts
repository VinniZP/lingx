import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { GetBranchQuery } from './get-branch.query.js';

/**
 * Handler for GetBranchQuery.
 * Retrieves a branch by ID after verifying user access.
 */
export class GetBranchHandler implements IQueryHandler<GetBranchQuery> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetBranchQuery): Promise<InferQueryResult<GetBranchQuery>> {
    const { branchId, userId } = query;

    // Find branch with details
    const branch = await this.branchRepository.findByIdWithKeyCount(branchId);
    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Verify user has access to the project
    await this.accessService.verifyProjectAccess(userId, branch.space.projectId);

    return branch;
  }
}
