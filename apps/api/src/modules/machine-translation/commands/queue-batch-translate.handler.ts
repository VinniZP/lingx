import { mtBatchQueue } from '../../../lib/queues.js';
import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { MTJobData } from '../../../workers/mt-batch.worker.js';
import type { AccessService } from '../../access/access.service.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { QueueBatchTranslateCommand } from './queue-batch-translate.command.js';

/**
 * Handler for QueueBatchTranslateCommand.
 * Queues a batch translation job for processing.
 */
export class QueueBatchTranslateHandler implements ICommandHandler<QueueBatchTranslateCommand> {
  constructor(
    private readonly mtRepository: MachineTranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(
    command: QueueBatchTranslateCommand
  ): Promise<InferCommandResult<QueueBatchTranslateCommand>> {
    // Any project member can queue batch translations (no role restriction required)
    // This allows translators to use MT for their assigned keys
    await this.accessService.verifyProjectAccess(command.userId, command.projectId);

    const { keyIds, targetLanguage, provider, overwriteExisting } = command.input;

    // Get project default language for source
    const project = await this.mtRepository.getProject(command.projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Estimate character count and track keys without source
    const keys = await this.mtRepository.getKeysWithSourceTranslations(
      keyIds,
      project.defaultLanguage
    );

    let keysWithoutSource = 0;
    const estimatedCharacters = keys.reduce((sum, key) => {
      const sourceTranslation = key.translations[0];
      if (!sourceTranslation?.value) {
        keysWithoutSource++;
        return sum;
      }
      return sum + sourceTranslation.value.length;
    }, 0);

    // Queue the job
    const job = await mtBatchQueue.add('translate-batch', {
      type: 'translate-batch',
      projectId: command.projectId,
      keyIds,
      targetLanguage,
      provider,
      overwriteExisting,
      userId: command.userId,
    } as MTJobData);

    return {
      message: 'Batch translation queued',
      jobId: job.id,
      totalKeys: keyIds.length,
      estimatedCharacters,
      warning:
        keysWithoutSource > 0
          ? `${keysWithoutSource} key(s) have no source translation and will be skipped`
          : undefined,
    };
  }
}
