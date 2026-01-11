import { glossaryQueue } from '../../../lib/queues.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { GlossaryJobData } from '../../../workers/glossary.worker.js';
import type { SyncProviderCommand } from './sync-provider.command.js';

/**
 * Handler for SyncProviderCommand.
 * Queues a job to sync glossary to MT provider.
 * Requires MANAGER or OWNER role.
 */
export class SyncProviderHandler implements ICommandHandler<SyncProviderCommand> {
  constructor(private readonly accessService: AccessService) {}

  async execute(command: SyncProviderCommand): Promise<InferCommandResult<SyncProviderCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const job: GlossaryJobData = {
      type: 'sync-provider',
      projectId: command.projectId,
      provider: command.provider,
      sourceLanguage: command.sourceLanguage,
      targetLanguage: command.targetLanguage,
    };
    const queuedJob = await glossaryQueue.add('sync-provider', job);

    return {
      message: 'Sync job queued',
      jobId: queuedJob.id,
    };
  }
}
