import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { RemoveBySourceKeyCommand } from './remove-by-source-key.command.js';

/**
 * Handler for RemoveBySourceKeyCommand.
 * Removes all TM entries associated with a source key.
 */
export class RemoveBySourceKeyHandler implements ICommandHandler<RemoveBySourceKeyCommand> {
  constructor(
    private readonly translationMemoryRepository: TranslationMemoryRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: RemoveBySourceKeyCommand
  ): Promise<InferCommandResult<RemoveBySourceKeyCommand>> {
    const { keyId } = command;

    try {
      const deletedCount = await this.translationMemoryRepository.deleteBySourceKey(keyId);

      if (deletedCount > 0) {
        this.logger.info({ keyId, deletedCount }, '[TM] Removed entries for deleted key');
      }

      return { deletedCount };
    } catch (err) {
      this.logger.error(
        { keyId, error: err instanceof Error ? err.message : 'Unknown error' },
        '[TM] Failed to remove entries for key'
      );
      throw err;
    }
  }
}
