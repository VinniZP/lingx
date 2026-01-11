import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { BulkIndexTMCommand } from './bulk-index-tm.command.js';

/**
 * Handler for BulkIndexTMCommand.
 * Bulk indexes all approved translations for a project into translation memory.
 */
export class BulkIndexTMHandler implements ICommandHandler<BulkIndexTMCommand> {
  constructor(
    private readonly translationMemoryRepository: TranslationMemoryRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: BulkIndexTMCommand): Promise<InferCommandResult<BulkIndexTMCommand>> {
    const { projectId } = command;

    this.logger.info({ projectId }, '[TM] Starting bulk index');

    try {
      // Get all approved translations with their default language counterpart
      const approvedTranslations =
        await this.translationMemoryRepository.getApprovedTranslationsForIndexing(projectId);

      // Bulk upsert all entries (repository handles batching and transactions)
      const indexed = await this.translationMemoryRepository.bulkUpsert(
        projectId,
        approvedTranslations
      );

      this.logger.info({ projectId, indexed }, '[TM] Bulk index completed');

      return { indexed };
    } catch (err) {
      this.logger.error(
        { projectId, error: err instanceof Error ? err.message : 'Unknown error' },
        '[TM] Bulk index failed'
      );
      throw err;
    }
  }
}
