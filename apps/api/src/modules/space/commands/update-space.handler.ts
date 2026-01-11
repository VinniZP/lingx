import { Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../../project/project.repository.js';
import { SpaceUpdatedEvent } from '../events/space-updated.event.js';
import type { SpaceRepository } from '../space.repository.js';
import type { UpdateSpaceCommand } from './update-space.command.js';

/**
 * Handler for UpdateSpaceCommand.
 * Updates a space's name and/or description.
 */
export class UpdateSpaceHandler implements ICommandHandler<UpdateSpaceCommand> {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateSpaceCommand): Promise<InferCommandResult<UpdateSpaceCommand>> {
    // Verify space exists and get project ID
    const projectId = await this.spaceRepository.getProjectIdBySpaceId(command.spaceId);
    if (!projectId) {
      throw new NotFoundError('Space');
    }

    // Verify user is a member of the project
    const role = await this.projectRepository.getMemberRole(projectId, command.userId);
    if (!role) {
      throw new ForbiddenError('Not a member of this project');
    }

    // Update space - handle race condition where space is deleted between check and update
    try {
      const space = await this.spaceRepository.update(command.spaceId, command.input);

      // Emit event
      await this.eventBus.publish(new SpaceUpdatedEvent(space, command.userId, command.input));

      return space;
    } catch (error) {
      // Handle race condition: space was deleted between existence check and update
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Space');
      }
      throw error;
    }
  }
}
