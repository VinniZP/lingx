import type { AccessService } from '../../../services/access.service.js';
import type { KeyContextService } from '../../../services/key-context.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetAIContextQuery } from './get-ai-context.query.js';

/**
 * Handler for GetAIContextQuery.
 * Returns AI context for translation assistance.
 */
export class GetAIContextHandler implements IQueryHandler<GetAIContextQuery> {
  constructor(
    private readonly keyContextService: KeyContextService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetAIContextQuery): Promise<InferQueryResult<GetAIContextQuery>> {
    const { branchId, keyId, targetLanguage, userId } = query;

    // Verify user has access to the branch and get project info
    const { defaultLanguage } = await this.accessService.verifyBranchAccess(userId, branchId);

    // Verify key exists and belongs to the branch
    await this.accessService.verifyKeyInBranch(userId, keyId, branchId);

    const sourceLanguage = defaultLanguage ?? 'en';

    // Get AI context
    return this.keyContextService.getAIContext(keyId, targetLanguage, sourceLanguage);
  }
}
