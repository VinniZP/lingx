import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import { Prisma } from '@prisma/client';
import {
  FieldValidationError,
  ForbiddenError,
  NotFoundError,
} from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../../project/project.repository.js';
import { SpaceCreatedEvent } from '../events/space-created.event.js';
import type { SpaceRepository } from '../space.repository.js';
import type { CreateSpaceCommand } from './create-space.command.js';

/**
 * Handler for CreateSpaceCommand.
 * Creates a new space with automatic main branch creation.
 */
export class CreateSpaceHandler implements ICommandHandler<CreateSpaceCommand> {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateSpaceCommand): Promise<InferCommandResult<CreateSpaceCommand>> {
    // Verify project exists
    const project = await this.projectRepository.findById(command.projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user is a member of the project
    const isMember = await this.projectRepository.checkMembership(
      command.projectId,
      command.userId
    );
    if (!isMember) {
      throw new ForbiddenError('Not a member of this project');
    }

    // Check for duplicate slug within project
    const slugExists = await this.spaceRepository.existsBySlugInProject(
      command.projectId,
      command.slug
    );
    if (slugExists) {
      throw new FieldValidationError(
        [
          {
            field: 'slug',
            message: 'A space with this slug already exists in this project',
            code: UNIQUE_VIOLATION_CODES.SPACE_SLUG,
          },
        ],
        'Space slug already exists in this project'
      );
    }

    // Create space - handle race condition with unique constraint
    try {
      const space = await this.spaceRepository.create({
        name: command.name,
        slug: command.slug,
        description: command.description,
        projectId: command.projectId,
      });

      // Emit event
      await this.eventBus.publish(new SpaceCreatedEvent(space, command.userId));

      return space;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle race condition: another request created a space with the same slug
        if (error.code === 'P2002') {
          throw new FieldValidationError(
            [
              {
                field: 'slug',
                message: 'A space with this slug already exists in this project',
                code: UNIQUE_VIOLATION_CODES.SPACE_SLUG,
              },
            ],
            'Space slug already exists in this project'
          );
        }
        // Handle race condition: project was deleted between check and space creation
        if (error.code === 'P2003' || error.code === 'P2025') {
          throw new NotFoundError('Project');
        }
      }
      throw error;
    }
  }
}
