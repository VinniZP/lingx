import type { AwilixContainer } from 'awilix';
import type { Constructor, IQuery, IQueryBus, IQueryHandler } from './interfaces.js';

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
  register<TQuery extends IQuery>(queryType: Constructor<TQuery>, handlerName: string): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler already registered for query: ${queryType.name}`);
    }
    this.handlers.set(queryType, handlerName);
  }

  /**
   * Execute a query through its registered handler.
   * @param query - The query instance to execute
   * @returns The result from the query handler
   * @throws Error if no handler is registered for the query type
   */
  async execute<TResult>(query: IQuery): Promise<TResult> {
    const queryType = query.constructor as Constructor;
    const handlerName = this.handlers.get(queryType);

    if (!handlerName) {
      throw new Error(`No handler registered for query: ${queryType.name}`);
    }

    const handler = this.container.resolve<IQueryHandler<IQuery, TResult>>(handlerName);
    return handler.execute(query);
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
