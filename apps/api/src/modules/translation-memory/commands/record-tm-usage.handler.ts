import { translationMemoryQueue } from '../../../lib/queues.js';
import { NotFoundError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TMJobData } from '../../../workers/translation-memory.worker.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { RecordTMUsageCommand } from './record-tm-usage.command.js';

/**
 * Handler for RecordTMUsageCommand.
 * Queues a job to record TM usage (non-blocking).
 */
export class RecordTMUsageHandler implements ICommandHandler<RecordTMUsageCommand> {
  constructor(
    private readonly accessService: AccessService,
    private readonly translationMemoryRepository: TranslationMemoryRepository
  ) {}

  async execute(command: RecordTMUsageCommand): Promise<InferCommandResult<RecordTMUsageCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId);

    // Validate entry belongs to this project
    const belongsToProject = await this.translationMemoryRepository.entryBelongsToProject(
      command.entryId,
      command.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Translation memory entry');
    }

    await translationMemoryQueue.add('update-usage', {
      type: 'update-usage',
      projectId: command.projectId,
      entryId: command.entryId,
    } satisfies TMJobData);

    return { success: true };
  }
}
