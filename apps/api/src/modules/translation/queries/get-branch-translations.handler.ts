import type { AccessService } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { GetBranchTranslationsQuery } from './get-branch-translations.query.js';

/**
 * Handler for GetBranchTranslationsQuery.
 * Gets all translations for a branch in bulk format (for CLI pull).
 *
 * Authorization: Requires project membership via branch access.
 */
export class GetBranchTranslationsHandler implements IQueryHandler<GetBranchTranslationsQuery> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(
    query: GetBranchTranslationsQuery
  ): Promise<InferQueryResult<GetBranchTranslationsQuery>> {
    const { branchId, userId } = query;

    // Verify user has access to the branch
    await this.accessService.verifyBranchAccess(userId, branchId);

    // Fetch translations from repository
    return this.translationRepository.getBranchTranslations(branchId);
  }
}
