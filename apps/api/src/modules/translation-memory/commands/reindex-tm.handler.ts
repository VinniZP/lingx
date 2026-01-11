import { translationMemoryQueue } from '../../../lib/queues.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TMJobData } from '../../../workers/translation-memory.worker.js';
import type { ReindexTMCommand } from './reindex-tm.command.js';

/**
 * Handler for ReindexTMCommand.
 * Triggers a full reindex of translation memory from approved translations.
 * Requires MANAGER or OWNER role.
 */
export class ReindexTMHandler implements ICommandHandler<ReindexTMCommand> {
  constructor(private readonly accessService: AccessService) {}

  async execute(command: ReindexTMCommand): Promise<InferCommandResult<ReindexTMCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    const job = await translationMemoryQueue.add('bulk-index', {
      type: 'bulk-index',
      projectId: command.projectId,
    } satisfies TMJobData);

    return {
      message: 'Reindex job queued',
      jobId: job.id ?? 'unknown',
    };
  }
}
