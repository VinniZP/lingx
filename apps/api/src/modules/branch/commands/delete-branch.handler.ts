import { NotFoundError, ValidationError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { BranchDeletedEvent } from '../events/branch-deleted.event.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { DeleteBranchCommand } from './delete-branch.command.js';

/**
 * Handler for DeleteBranchCommand.
 * Deletes a branch after verifying it's not the default and not used by environments.
 */
export class DeleteBranchHandler implements ICommandHandler<DeleteBranchCommand> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteBranchCommand): Promise<InferCommandResult<DeleteBranchCommand>> {
    const { branchId, userId } = command;

    // Find branch
    const branch = await this.branchRepository.findById(branchId);
    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Get project ID for authorization
    const projectId = await this.branchRepository.getProjectIdByBranchId(branchId);
    if (!projectId) {
      throw new NotFoundError('Branch');
    }

    // Verify user has access to the project
    await this.accessService.verifyProjectAccess(userId, projectId);

    // Cannot delete default branch
    if (branch.isDefault) {
      throw new ValidationError('Cannot delete the default branch');
    }

    // Cannot delete branch used by environments
    const hasEnvironments = await this.branchRepository.hasEnvironments(branchId);
    if (hasEnvironments) {
      throw new ValidationError('Cannot delete branch: it is used by one or more environments');
    }

    // Delete the branch
    await this.branchRepository.delete(branchId);

    // Emit event for side effects (activity logging, etc.)
    await this.eventBus.publish(new BranchDeletedEvent(branchId, branch.name, projectId, userId));
  }
}
