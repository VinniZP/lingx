import { glossaryQueue } from '../../../lib/queues.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { GlossaryJobData } from '../../../workers/glossary.worker.js';
import type { DeleteProviderSyncCommand } from './delete-provider-sync.command.js';

/**
 * Handler for DeleteProviderSyncCommand.
 * Queues a job to remove glossary from MT provider.
 * Requires MANAGER or OWNER role.
 */
export class DeleteProviderSyncHandler implements ICommandHandler<DeleteProviderSyncCommand> {
  constructor(private readonly accessService: AccessService) {}

  async execute(
    command: DeleteProviderSyncCommand
  ): Promise<InferCommandResult<DeleteProviderSyncCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const job: GlossaryJobData = {
      type: 'delete-provider-glossary',
      projectId: command.projectId,
      provider: command.provider,
      sourceLanguage: command.sourceLanguage,
      targetLanguage: command.targetLanguage,
    };
    await glossaryQueue.add('delete-provider-glossary', job);

    return { success: true };
  }
}
