import { Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { ProjectRepository } from '../../project/project.repository.js';
import { SpaceDeletedEvent } from '../events/space-deleted.event.js';
import type { SpaceRepository } from '../space.repository.js';
import type { DeleteSpaceCommand } from './delete-space.command.js';

/**
 * Handler for DeleteSpaceCommand.
 * Deletes a space and all its branches, keys, and translations (cascade).
 */
export class DeleteSpaceHandler implements ICommandHandler<DeleteSpaceCommand> {
  constructor(
    private readonly spaceRepository: SpaceRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteSpaceCommand): Promise<InferCommandResult<DeleteSpaceCommand>> {
    // Verify space exists and get project ID
    const projectId = await this.spaceRepository.getProjectIdBySpaceId(command.spaceId);
    if (!projectId) {
      throw new NotFoundError('Space');
    }

    // Verify user has MANAGER or OWNER role
    const role = await this.projectRepository.getMemberRole(projectId, command.userId);
    if (!role) {
      throw new ForbiddenError('Not a member of this project');
    }
    if (role === 'DEVELOPER') {
      throw new ForbiddenError('Requires manager or owner role');
    }

    // Delete space (cascades to branches, keys, translations)
    // Handle race condition where space is deleted between check and delete
    try {
      await this.spaceRepository.delete(command.spaceId);

      // Emit event
      await this.eventBus.publish(
        new SpaceDeletedEvent(command.spaceId, projectId, command.userId)
      );
    } catch (error) {
      // Handle race condition: space was deleted between existence check and delete
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Space');
      }
      throw error;
    }
  }
}
