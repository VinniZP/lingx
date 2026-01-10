import type { IQuery } from '../../../shared/cqrs/index.js';
import type { NamespaceCount } from '../repositories/translation.repository.js';

/**
 * Query to list unique namespaces with key counts.
 */
export class ListNamespacesQuery implements IQuery<NamespaceCount[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: NamespaceCount[];

  constructor(
    public readonly branchId: string,
    public readonly userId: string
  ) {}
}
