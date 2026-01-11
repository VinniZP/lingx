import type { RelationshipType } from '@prisma/client';
import type { RelatedKeysResult } from '../../../services/key-context.service.js';
import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Result includes the key info and its relationships.
 */
export interface GetRelatedKeysResult {
  key: {
    id: string;
    name: string;
    namespace: string | null;
  };
  relationships: RelatedKeysResult;
}

/**
 * Query to get related keys for a specific key.
 */
export class GetRelatedKeysQuery implements IQuery<GetRelatedKeysResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: GetRelatedKeysResult;

  constructor(
    public readonly branchId: string,
    public readonly keyId: string,
    public readonly types: RelationshipType[] | undefined,
    public readonly limit: number | undefined,
    public readonly includeTranslations: boolean | undefined,
    public readonly userId: string
  ) {}
}
