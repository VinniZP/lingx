import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { GlossaryTagDeletedEvent } from '../events/glossary-tag-deleted.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { DeleteTagCommand } from './delete-tag.command.js';

/**
 * Handler for DeleteTagCommand.
 * Deletes a glossary tag.
 * Requires MANAGER or OWNER role.
 */
export class DeleteTagHandler implements ICommandHandler<DeleteTagCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteTagCommand): Promise<InferCommandResult<DeleteTagCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const belongsToProject = await this.glossaryRepository.tagBelongsToProject(
      command.tagId,
      command.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Glossary tag');
    }

    await this.glossaryRepository.deleteTag(command.tagId);

    await this.eventBus.publish(
      new GlossaryTagDeletedEvent(command.projectId, command.tagId, command.userId)
    );

    return { success: true };
  }
}
