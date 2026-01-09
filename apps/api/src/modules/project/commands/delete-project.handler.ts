import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ProjectDeletedEvent } from '../events/project-deleted.event.js';
import type { ProjectRepository } from '../project.repository.js';
import type { DeleteProjectCommand } from './delete-project.command.js';

/**
 * Handler for DeleteProjectCommand.
 * Deletes a project and emits ProjectDeletedEvent.
 */
export class DeleteProjectHandler implements ICommandHandler<DeleteProjectCommand> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteProjectCommand): Promise<InferCommandResult<DeleteProjectCommand>> {
    // Find project by ID or slug
    const project = await this.projectRepository.findByIdOrSlug(command.projectIdOrSlug);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user is OWNER
    await this.accessService.verifyProjectAccess(command.userId, project.id, ['OWNER']);

    // Delete project
    await this.projectRepository.delete(project.id);

    // Emit event
    await this.eventBus.publish(new ProjectDeletedEvent(project.id, project.name, command.userId));
  }
}
