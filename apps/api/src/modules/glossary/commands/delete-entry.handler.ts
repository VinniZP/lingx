import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { GlossaryEntryDeletedEvent } from '../events/glossary-entry-deleted.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { DeleteEntryCommand } from './delete-entry.command.js';

/**
 * Handler for DeleteEntryCommand.
 * Deletes a glossary entry and emits a deletion event.
 * Requires MANAGER or OWNER role.
 */
export class DeleteEntryHandler implements ICommandHandler<DeleteEntryCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: DeleteEntryCommand): Promise<InferCommandResult<DeleteEntryCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const belongsToProject = await this.glossaryRepository.entryBelongsToProject(
      command.entryId,
      command.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Glossary entry');
    }

    await this.glossaryRepository.deleteEntry(command.entryId);

    await this.eventBus.publish(
      new GlossaryEntryDeletedEvent(command.projectId, command.entryId, command.userId)
    );

    return { success: true };
  }
}
