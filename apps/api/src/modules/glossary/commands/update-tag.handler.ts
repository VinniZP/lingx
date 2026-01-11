import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { GlossaryTagUpdatedEvent } from '../events/glossary-tag-updated.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { UpdateTagCommand } from './update-tag.command.js';

/**
 * Handler for UpdateTagCommand.
 * Updates a glossary tag.
 * Requires MANAGER or OWNER role.
 */
export class UpdateTagHandler implements ICommandHandler<UpdateTagCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateTagCommand): Promise<InferCommandResult<UpdateTagCommand>> {
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

    const tag = await this.glossaryRepository.updateTag(command.tagId, command.name, command.color);

    await this.eventBus.publish(
      new GlossaryTagUpdatedEvent(command.projectId, tag, command.userId)
    );

    return tag;
  }
}
