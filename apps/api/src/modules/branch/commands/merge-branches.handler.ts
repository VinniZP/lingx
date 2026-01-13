import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { BranchesMergedEvent } from '../events/branches-merged.event.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { MergeExecutor } from '../services/merge-executor.js';
import type { MergeBranchesCommand } from './merge-branches.command.js';

/**
 * Handler for MergeBranchesCommand.
 * Merges source branch into target branch.
 *
 * Per Design Doc: AC-WEB-015 - Merge with conflicts and resolution
 */
export class MergeBranchesHandler implements ICommandHandler<MergeBranchesCommand> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly mergeExecutor: MergeExecutor,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: MergeBranchesCommand): Promise<InferCommandResult<MergeBranchesCommand>> {
    const { sourceBranchId, targetBranchId, resolutions, userId } = command;

    // Get project ID for authorization
    const projectId = await this.branchRepository.getProjectIdByBranchId(sourceBranchId);
    if (!projectId) {
      throw new NotFoundError('Source branch');
    }

    // Verify user has access to the project
    await this.accessService.verifyProjectAccess(userId, projectId);

    // Get branch details for validation and event metadata
    const [sourceBranch, targetBranch] = await Promise.all([
      this.branchRepository.findById(sourceBranchId),
      this.branchRepository.findById(targetBranchId),
    ]);

    // Validate both branches exist
    if (!sourceBranch) {
      throw new NotFoundError('Source branch');
    }
    if (!targetBranch) {
      throw new NotFoundError('Target branch');
    }

    // Delegate to MergeExecutor
    const result = await this.mergeExecutor.merge(sourceBranchId, {
      targetBranchId,
      resolutions,
    });

    // Only emit event if merge was successful (no conflicts returned)
    if (result.success) {
      await this.eventBus.publish(
        new BranchesMergedEvent(
          sourceBranchId,
          sourceBranch.name,
          targetBranchId,
          targetBranch.name,
          projectId,
          resolutions?.length ?? 0,
          userId
        )
      );
    }

    return result;
  }
}
