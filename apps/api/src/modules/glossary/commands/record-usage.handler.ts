import { glossaryQueue } from '../../../lib/queues.js';
import { NotFoundError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { GlossaryJobData } from '../../../workers/glossary.worker.js';
import type { AccessService } from '../../access/access.service.js';
import type { GlossaryRepository } from '../repositories/glossary.repository.js';
import type { RecordUsageCommand } from './record-usage.command.js';

/**
 * Handler for RecordUsageCommand.
 * Queues usage tracking for async processing.
 */
export class RecordUsageHandler implements ICommandHandler<RecordUsageCommand> {
  constructor(
    private readonly accessService: AccessService,
    private readonly glossaryRepository: GlossaryRepository
  ) {}

  async execute(command: RecordUsageCommand): Promise<InferCommandResult<RecordUsageCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId);

    // Verify entry belongs to project
    const belongsToProject = await this.glossaryRepository.entryBelongsToProject(
      command.entryId,
      command.projectId
    );
    if (!belongsToProject) {
      throw new NotFoundError('Glossary entry not found');
    }

    const job: GlossaryJobData = {
      type: 'record-usage',
      projectId: command.projectId,
      entryId: command.entryId,
    };
    await glossaryQueue.add('record-usage', job);

    return { success: true };
  }
}
