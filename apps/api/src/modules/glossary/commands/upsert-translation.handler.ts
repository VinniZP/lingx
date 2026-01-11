import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { GlossaryTranslationUpdatedEvent } from '../events/glossary-translation-updated.event.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { UpsertTranslationCommand } from './upsert-translation.command.js';

/**
 * Handler for UpsertTranslationCommand.
 * Adds or updates a translation for a glossary entry.
 */
export class UpsertTranslationHandler implements ICommandHandler<UpsertTranslationCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: UpsertTranslationCommand
  ): Promise<InferCommandResult<UpsertTranslationCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId);

    const belongsToProject = await this.glossaryRepository.entryBelongsToProject(
      command.entryId,
      command.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Glossary entry');
    }

    await this.glossaryRepository.upsertTranslation(
      command.entryId,
      command.targetLanguage,
      command.targetTerm,
      command.notes
    );

    await this.eventBus.publish(
      new GlossaryTranslationUpdatedEvent(
        command.projectId,
        command.entryId,
        command.targetLanguage,
        command.targetTerm,
        command.userId
      )
    );

    return { success: true };
  }
}
