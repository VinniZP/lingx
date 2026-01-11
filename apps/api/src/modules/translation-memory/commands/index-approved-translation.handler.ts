import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { TranslationMemoryRepository } from '../repositories/translation-memory.repository.js';
import type { IndexApprovedTranslationCommand } from './index-approved-translation.command.js';

/**
 * Handler for IndexApprovedTranslationCommand.
 * Indexes a single approved translation into translation memory.
 */
export class IndexApprovedTranslationHandler implements ICommandHandler<IndexApprovedTranslationCommand> {
  constructor(
    private readonly translationMemoryRepository: TranslationMemoryRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(
    command: IndexApprovedTranslationCommand
  ): Promise<InferCommandResult<IndexApprovedTranslationCommand>> {
    const { projectId, translationId } = command;

    // Get the translation with its context (default language source text)
    const translation =
      await this.translationMemoryRepository.getTranslationWithContext(translationId);

    if (!translation) {
      this.logger.warn({ translationId }, '[TM] Translation not found');
      return;
    }

    // Skip if not approved
    if (translation.status !== 'APPROVED') {
      this.logger.debug(
        { translationId, status: translation.status },
        '[TM] Skipping non-approved translation'
      );
      return;
    }

    // Skip if no default language configured
    if (!translation.defaultLanguageCode) {
      this.logger.warn({ projectId }, '[TM] No default language for project');
      return;
    }

    // Skip if this is the default language (we don't index source->source)
    if (translation.language === translation.defaultLanguageCode) {
      this.logger.debug(
        { translationId, language: translation.language },
        '[TM] Skipping default language translation'
      );
      return;
    }

    // Skip if no source text available
    if (!translation.sourceText?.trim()) {
      this.logger.debug({ translationId }, '[TM] Skipping translation with empty source text');
      return;
    }

    // Skip if no target text available
    if (!translation.value?.trim()) {
      this.logger.debug({ translationId }, '[TM] Skipping translation with empty target text');
      return;
    }

    // Index into translation memory
    try {
      await this.translationMemoryRepository.upsertEntry({
        projectId,
        sourceLanguage: translation.defaultLanguageCode,
        targetLanguage: translation.language,
        sourceText: translation.sourceText,
        targetText: translation.value,
        sourceKeyId: translation.keyId,
        sourceBranchId: translation.branchId,
      });

      this.logger.info(
        {
          translationId,
          sourceLanguage: translation.defaultLanguageCode,
          targetLanguage: translation.language,
        },
        '[TM] Indexed translation'
      );
    } catch (err) {
      this.logger.error(
        { translationId, error: err instanceof Error ? err.message : 'Unknown error' },
        '[TM] Failed to index translation'
      );
      throw err; // Re-throw to trigger retry
    }
  }
}
