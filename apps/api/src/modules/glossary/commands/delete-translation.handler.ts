import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { GlossaryTranslationDeletedEvent } from '../events/glossary-translation-deleted.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { DeleteTranslationCommand } from './delete-translation.command.js';

/**
 * Handler for DeleteTranslationCommand.
 * Deletes a translation from a glossary entry.
 * Requires MANAGER or OWNER role.
 */
export class DeleteTranslationHandler implements ICommandHandler<DeleteTranslationCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: DeleteTranslationCommand
  ): Promise<InferCommandResult<DeleteTranslationCommand>> {
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

    await this.glossaryRepository.deleteTranslation(command.entryId, command.targetLanguage);

    await this.eventBus.publish(
      new GlossaryTranslationDeletedEvent(
        command.projectId,
        command.entryId,
        command.targetLanguage,
        command.userId
      )
    );

    return { success: true };
  }
}
