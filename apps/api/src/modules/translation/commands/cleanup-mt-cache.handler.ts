import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { CleanupMTCacheCommand } from './cleanup-mt-cache.command.js';

/**
 * Handler for CleanupMTCacheCommand.
 *
 * Cleans up expired machine translation cache entries for a project.
 *
 * Used by:
 * - MT batch worker for `cleanup-cache` job type
 */
export class CleanupMTCacheHandler implements ICommandHandler<CleanupMTCacheCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: CleanupMTCacheCommand
  ): Promise<InferCommandResult<CleanupMTCacheCommand>> {
    const { projectId } = command;

    const deletedCount = await this.translationRepository.cleanupExpiredMTCache(projectId);

    this.logger.info({ projectId, deletedCount }, 'Cleaned up expired MT cache entries');

    return { deletedCount };
  }
}
