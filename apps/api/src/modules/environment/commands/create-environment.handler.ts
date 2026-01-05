import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import {
  FieldValidationError,
  NotFoundError,
  ValidationError,
} from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus } from '../../../shared/cqrs/index.js';
import type { EnvironmentRepository } from '../environment.repository.js';
import { EnvironmentCreatedEvent } from '../events/environment-created.event.js';
import type {
  CreateEnvironmentCommand,
  CreateEnvironmentResult,
} from './create-environment.command.js';

/**
 * Handler for CreateEnvironmentCommand.
 * Creates a new environment and publishes EnvironmentCreatedEvent.
 */
export class CreateEnvironmentHandler implements ICommandHandler<
  CreateEnvironmentCommand,
  CreateEnvironmentResult
> {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateEnvironmentCommand): Promise<CreateEnvironmentResult> {
    const { name, slug, projectId, branchId, userId } = command;

    // Verify project exists
    const projectExists = await this.environmentRepository.projectExists(projectId);
    if (!projectExists) {
      throw new NotFoundError('Project');
    }

    // Verify branch exists and belongs to project
    const branch = await this.environmentRepository.findBranchById(branchId);
    if (!branch) {
      throw new NotFoundError('Branch');
    }

    if (branch.space.projectId !== projectId) {
      throw new ValidationError('Branch must belong to a space in this project');
    }

    // Check for duplicate slug
    const existing = await this.environmentRepository.findByProjectAndSlug(projectId, slug);
    if (existing) {
      throw new FieldValidationError(
        [
          {
            field: 'slug',
            message: 'An environment with this slug already exists in this project',
            code: UNIQUE_VIOLATION_CODES.ENVIRONMENT_SLUG,
          },
        ],
        'Environment with this slug already exists'
      );
    }

    // Create the environment
    const environment = await this.environmentRepository.create({
      name,
      slug,
      projectId,
      branchId,
    });

    // Publish event for side effects (activity logging, etc.)
    await this.eventBus.publish(new EnvironmentCreatedEvent(environment, userId));

    return environment;
  }
}
