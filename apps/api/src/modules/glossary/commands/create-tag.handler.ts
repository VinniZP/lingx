import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { GlossaryTagCreatedEvent } from '../events/glossary-tag-created.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { CreateTagCommand } from './create-tag.command.js';

/**
 * Handler for CreateTagCommand.
 * Creates a new glossary tag.
 * Requires MANAGER or OWNER role.
 */
export class CreateTagHandler implements ICommandHandler<CreateTagCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateTagCommand): Promise<InferCommandResult<CreateTagCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const tag = await this.glossaryRepository.createTag(
      command.projectId,
      command.name,
      command.color
    );

    await this.eventBus.publish(
      new GlossaryTagCreatedEvent(command.projectId, tag, command.userId)
    );

    return tag;
  }
}
