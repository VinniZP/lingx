import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { UpdateTMUsageCommand } from './update-tm-usage.command.js';

/**
 * Handler for UpdateTMUsageCommand.
 * Updates the usage count for a TM entry.
 */
export class UpdateTMUsageHandler implements ICommandHandler<UpdateTMUsageCommand> {
  constructor(
    private readonly translationMemoryRepository: TranslationMemoryRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: UpdateTMUsageCommand): Promise<InferCommandResult<UpdateTMUsageCommand>> {
    const { entryId } = command;

    try {
      const updated = await this.translationMemoryRepository.recordUsage(entryId);

      if (!updated) {
        this.logger.warn({ entryId }, '[TM] Entry not found for usage update');
      }
    } catch (err) {
      this.logger.error(
        { entryId, error: err instanceof Error ? err.message : 'Unknown error' },
        '[TM] Failed to update usage count'
      );
      throw err;
    }
  }
}
