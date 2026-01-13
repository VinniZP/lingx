import { NotFoundError } from '../../../plugins/error-handler.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { DiffCalculator } from '../services/diff-calculator.js';
import type { ComputeDiffQuery } from './compute-diff.query.js';

/**
 * Handler for ComputeDiffQuery.
 * Computes diff between two branches after verifying user access.
 */
export class ComputeDiffHandler implements IQueryHandler<ComputeDiffQuery> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly diffCalculator: DiffCalculator,
    private readonly accessService: AccessService
  ) {}

  async execute(query: ComputeDiffQuery): Promise<InferQueryResult<ComputeDiffQuery>> {
    const { sourceBranchId, targetBranchId, userId } = query;

    // Get project ID from source branch for authorization
    const projectId = await this.branchRepository.getProjectIdByBranchId(sourceBranchId);
    if (!projectId) {
      throw new NotFoundError('Source branch');
    }

    // Verify user has access to the project
    await this.accessService.verifyProjectAccess(userId, projectId);

    // Delegate to DiffCalculator for the actual computation
    return this.diffCalculator.computeDiff(sourceBranchId, targetBranchId);
  }
}
