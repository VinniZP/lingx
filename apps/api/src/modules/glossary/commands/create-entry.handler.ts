import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { GlossaryEntryCreatedEvent } from '../events/glossary-entry-created.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { CreateEntryCommand } from './create-entry.command.js';

/**
 * Handler for CreateEntryCommand.
 * Creates a new glossary entry and emits a creation event.
 */
export class CreateEntryHandler implements ICommandHandler<CreateEntryCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateEntryCommand): Promise<InferCommandResult<CreateEntryCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId);

    const entry = await this.glossaryRepository.createEntry(
      command.projectId,
      command.input,
      command.userId
    );

    await this.eventBus.publish(new GlossaryEntryCreatedEvent(entry, command.userId));

    return entry;
  }
}
