import { mtBatchQueue } from '../../../lib/queues.js';
import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { MTJobData } from '../../../workers/mt-batch.worker.js';
import type { AccessService } from '../../access/access.service.js';
import type { MachineTranslationRepository } from '../repositories/machine-translation.repository.js';
import type { QueuePreTranslateCommand } from './queue-pre-translate.command.js';

/**
 * Handler for QueuePreTranslateCommand.
 * Queues a pre-translation job for all missing translations in a branch.
 */
export class QueuePreTranslateHandler implements ICommandHandler<QueuePreTranslateCommand> {
  constructor(
    private readonly machineTranslationRepository: MachineTranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(
    command: QueuePreTranslateCommand
  ): Promise<InferCommandResult<QueuePreTranslateCommand>> {
    // Pre-translate affects all keys in a branch - requires MANAGER or OWNER role
    // to prevent accidental mass translations by regular translators
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const { branchId, targetLanguages, provider } = command.input;

    // Get project default language for source
    const project = await this.machineTranslationRepository.getProject(command.projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Count keys and estimate characters, tracking keys without source
    const keys = await this.machineTranslationRepository.getBranchKeysWithSourceTranslations(
      branchId,
      project.defaultLanguage
    );

    let keysWithoutSource = 0;
    const estimatedCharacters = keys.reduce((sum, key) => {
      const sourceTranslation = key.translations[0];
      if (!sourceTranslation?.value) {
        keysWithoutSource++;
        return sum;
      }
      return sum + sourceTranslation.value.length * targetLanguages.length;
    }, 0);

    // Queue the job
    const job = await mtBatchQueue.add('pre-translate', {
      type: 'pre-translate',
      projectId: command.projectId,
      branchId,
      targetLanguages,
      provider,
      userId: command.userId,
    } as MTJobData);

    return {
      message: 'Pre-translation queued',
      jobId: job.id!,
      totalKeys: keys.length,
      targetLanguages,
      estimatedCharacters,
      warning:
        keysWithoutSource > 0
          ? `${keysWithoutSource} key(s) have no source translation and will be skipped`
          : undefined,
    };
  }
}
