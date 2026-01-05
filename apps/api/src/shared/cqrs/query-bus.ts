import type { AwilixContainer } from 'awilix';
import type {
  Constructor,
  IQuery,
  IQueryBus,
  IQueryHandler,
  InferQueryResult,
} from './interfaces.js';

/**
 * QueryBus dispatches queries to their registered handlers.
 *
 * Queries represent read operations that return data without side effects.
 * Each query type has exactly one handler.
 *
 * @example
 * ```typescript
 * // In route handler
 * const translations = await queryBus.execute(
 *   new GetTranslationsQuery(branchId, { search, page })
 * );
 * ```
 */
export class QueryBus implements IQueryBus {
  private readonly handlers = new Map<Constructor, string>();

  constructor(private readonly container: AwilixContainer) {}

  /**
   * Register a handler for a query type.
   * @param queryType - The query class constructor
   * @param handlerName - The container registration name for the handler
   */
  register<TResult, TQuery extends IQuery<TResult>>(
    queryType: Constructor<TQuery>,
    handlerName: string
  ): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler already registered for query: ${queryType.name}`);
    }
    this.handlers.set(queryType, handlerName);
  }

  /**
   * Execute a query through its registered handler.
   * Result type is automatically inferred from the query's TResult type parameter.
   *
   * @param query - The query instance to execute
   * @returns The result from the query handler (type inferred from query)
   * @throws Error if no handler is registered for the query type
   */
  async execute<TQuery extends IQuery<unknown>>(query: TQuery): Promise<InferQueryResult<TQuery>> {
    const queryType = query.constructor as Constructor;
    const handlerName = this.handlers.get(queryType);

    if (!handlerName) {
      throw new Error(`No handler registered for query: ${queryType.name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = this.container.resolve<IQueryHandler<any, any>>(handlerName);
    return handler.execute(query) as Promise<InferQueryResult<TQuery>>;
  }

  /**
   * Check if a handler is registered for a query type.
   */
  hasHandler(queryType: Constructor): boolean {
    return this.handlers.has(queryType);
  }

  /**
   * Get all registered query types.
   */
  getRegisteredQueries(): Constructor[] {
    return Array.from(this.handlers.keys());
  }
}
