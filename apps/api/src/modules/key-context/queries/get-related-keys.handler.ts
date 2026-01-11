import type { AccessService } from '../../../services/access.service.js';
import type { KeyContextService } from '../../../services/key-context.service.js';
import type { IQueryHandler, InferQueryResult } from '../../../shared/cqrs/index.js';
import type { GetRelatedKeysQuery } from './get-related-keys.query.js';

/**
 * Handler for GetRelatedKeysQuery.
 * Returns related keys for a specific key.
 */
export class GetRelatedKeysHandler implements IQueryHandler<GetRelatedKeysQuery> {
  constructor(
    private readonly keyContextService: KeyContextService,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetRelatedKeysQuery): Promise<InferQueryResult<GetRelatedKeysQuery>> {
    const { branchId, keyId, types, limit, includeTranslations, userId } = query;

    // Verify user has access to the branch
    await this.accessService.verifyBranchAccess(userId, branchId);

    // Verify key exists, belongs to the branch, and get key info
    const key = await this.accessService.verifyKeyInBranch(userId, keyId, branchId);

    // Get related keys
    const relationships = await this.keyContextService.getRelatedKeys(keyId, {
      types,
      limit,
      includeTranslations,
    });

    return {
      key: {
        id: key.id,
        name: key.name,
        namespace: key.namespace,
      },
      relationships,
    };
  }
}
