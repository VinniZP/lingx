import { NotFoundError, ValidationError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { BranchSwitchedEvent } from '../events/branch-switched.event.js';
import type { SwitchBranchCommand } from './switch-branch.command.js';

/**
 * Handler for SwitchBranchCommand.
 * Switches an environment's branch pointer and publishes BranchSwitchedEvent.
 *
 * Authorization: Requires MANAGER or OWNER role on the project.
 */
export class SwitchBranchHandler implements ICommandHandler<SwitchBranchCommand> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus,
    private readonly accessService: AccessService
  ) {}

  async execute(command: SwitchBranchCommand): Promise<InferCommandResult<SwitchBranchCommand>> {
    const { environmentId, branchId, userId } = command;

    // Get existing environment
    const existing = await this.environmentRepository.findById(environmentId);
    if (!existing) {
      throw new NotFoundError('Environment');
    }

    // Authorization: requires MANAGER or OWNER role
    await this.accessService.verifyProjectAccess(userId, existing.projectId, ['MANAGER', 'OWNER']);

    // Verify new branch exists and belongs to same project
    const newBranch = await this.environmentRepository.findBranchById(branchId);
    if (!newBranch) {
      throw new NotFoundError('Branch');
    }

    if (newBranch.space.projectId !== existing.projectId) {
      throw new ValidationError('Branch must belong to this project');
    }

    // Get old branch info for event
    const previousBranchId = existing.branchId;
    const previousBranchName = existing.branch.name;

    // Switch the branch
    const environment = await this.environmentRepository.switchBranch(environmentId, branchId);

    // Publish event for side effects (activity logging, etc.)
    await this.eventBus.publish(
      new BranchSwitchedEvent(environment, previousBranchId, previousBranchName, userId)
    );

    return environment;
  }
}
