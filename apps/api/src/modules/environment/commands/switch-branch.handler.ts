import { NotFoundError, ValidationError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { BranchSwitchedEvent } from '../events/branch-switched.event.js';
import type { SwitchBranchCommand, SwitchBranchResult } from './switch-branch.command.js';

/**
 * Handler for SwitchBranchCommand.
 * Switches an environment's branch pointer and publishes BranchSwitchedEvent.
 */
export class SwitchBranchHandler implements ICommandHandler<
  SwitchBranchCommand,
  SwitchBranchResult
> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: SwitchBranchCommand): Promise<SwitchBranchResult> {
    const { environmentId, branchId, userId } = command;

    // Get existing environment
    const existing = await this.environmentRepository.findById(environmentId);
    if (!existing) {
      throw new NotFoundError('Environment');
    }

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
