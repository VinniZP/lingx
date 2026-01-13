import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { GlossaryEntryUpdatedEvent } from '../events/glossary-entry-updated.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { UpdateEntryCommand } from './update-entry.command.js';

/**
 * Handler for UpdateEntryCommand.
 * Updates a glossary entry and emits an update event.
 */
export class UpdateEntryHandler implements ICommandHandler<UpdateEntryCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateEntryCommand): Promise<InferCommandResult<UpdateEntryCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId);

    const belongsToProject = await this.glossaryRepository.entryBelongsToProject(
      command.entryId,
      command.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Glossary entry');
    }

    const entry = await this.glossaryRepository.updateEntry(command.entryId, command.input);

    await this.eventBus.publish(new GlossaryEntryUpdatedEvent(entry, command.userId));

    return entry;
  }
}
