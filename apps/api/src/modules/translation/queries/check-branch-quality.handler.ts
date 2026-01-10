import type { AccessService, ProjectInfo } from '../../../services/access.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { CheckBranchQualityQuery } from './check-branch-quality.query.js';

/**
 * Handler for CheckBranchQualityQuery.
 * Runs quality checks on branch translations.
 *
 * Authorization: Requires project membership via branch access.
 */
export class CheckBranchQualityHandler implements IQueryHandler<CheckBranchQualityQuery> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(
    query: CheckBranchQualityQuery
  ): Promise<InferQueryResult<CheckBranchQualityQuery>> {
    const { branchId, userId, keyIds } = query;

    // Verify user has access to the branch and get project info
    const projectInfo: ProjectInfo = await this.accessService.verifyBranchAccess(userId, branchId);

    // Run quality checks using the project's default language
    return this.translationRepository.checkBranchQuality(
      branchId,
      projectInfo.defaultLanguage,
      keyIds
    );
  }
}
