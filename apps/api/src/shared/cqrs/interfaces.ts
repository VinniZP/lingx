/**
 * CQRS-lite Infrastructure Interfaces
 *
 * These interfaces define the contract for Commands, Queries, Events,
 * and their respective handlers in the Lingx backend.
 *
 * Type Safety: Commands and Queries carry their result type via phantom types,
 * enabling automatic type inference at call sites.
 */

// ============================================================================
// Base Interfaces
// ============================================================================

/**
 * Marker interface for commands (write operations).
 * Commands change state and may emit events.
 *
 * @template TResult - The type returned after command execution
 *
 * @example
 * ```typescript
 * class CreateUserCommand implements ICommand<User> {
 *   readonly __brand = 'command' as const;
 *   constructor(public readonly name: string) {}
 * }
 *
 * // Result type is inferred automatically
 * const user = await commandBus.execute(new CreateUserCommand('Alice'));
 * // user: User
 * ```
 */
export interface ICommand<TResult = void> {
  readonly __brand: 'command';
  /** Phantom type for result type inference. Not used at runtime. */
  readonly __resultType?: TResult;
}

/**
 * Marker interface for queries (read operations).
 * Queries are pure reads with no side effects.
 *
 * @template TResult - The type returned by the query
 *
 * @example
 * ```typescript
 * class GetUserQuery implements IQuery<User> {
 *   readonly __brand = 'query' as const;
 *   constructor(public readonly id: string) {}
 * }
 *
 * // Result type is inferred automatically
 * const user = await queryBus.execute(new GetUserQuery('123'));
 * // user: User
 * ```
 */
export interface IQuery<TResult = unknown> {
  readonly __brand: 'query';
  /** Phantom type for result type inference. Not used at runtime. */
  readonly __resultType?: TResult;
}

// ============================================================================
// Type Inference Helpers
// ============================================================================

/**
 * Extracts the result type from a command type.
 * Used internally by CommandBus for type inference.
 */
export type InferCommandResult<T extends ICommand<unknown>> =
  T extends ICommand<infer R> ? R : never;

/**
 * Extracts the result type from a query type.
 * Used internally by QueryBus for type inference.
 */
export type InferQueryResult<T extends IQuery<unknown>> = T extends IQuery<infer R> ? R : never;

/**
 * Base interface for domain events.
 * Events represent something that has happened in the system.
 */
export interface IEvent {
  readonly occurredAt: Date;
}

// ============================================================================
// Handler Interfaces
// ============================================================================

/**
 * Handler for a specific command type.
 * @template TCommand - The command type this handler processes
 * @template TResult - The return type after command execution (inferred from command)
 */
export interface ICommandHandler<
  TCommand extends ICommand<TResult>,
  TResult = InferCommandResult<TCommand>,
> {
  execute(command: TCommand): Promise<TResult>;
}

/**
 * Handler for a specific query type.
 * @template TQuery - The query type this handler processes
 * @template TResult - The data returned by the query (inferred from query)
 */
export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult = InferQueryResult<TQuery>> {
  execute(query: TQuery): Promise<TResult>;
}

/**
 * Handler for a specific event type.
 * Event handlers process side effects asynchronously.
 * @template TEvent - The event type this handler processes
 */
export interface IEventHandler<TEvent extends IEvent> {
  handle(event: TEvent): Promise<void>;
}

// ============================================================================
// Bus Interfaces
// ============================================================================

/**
 * Command bus dispatches commands to their handlers.
 * Result type is inferred from the command's TResult type parameter.
 */
export interface ICommandBus {
  execute<TCommand extends ICommand<unknown>>(
    command: TCommand
  ): Promise<InferCommandResult<TCommand>>;
}

/**
 * Query bus dispatches queries to their handlers.
 * Result type is inferred from the query's TResult type parameter.
 */
export interface IQueryBus {
  execute<TQuery extends IQuery<unknown>>(query: TQuery): Promise<InferQueryResult<TQuery>>;
}

/**
 * Event bus publishes events to all registered handlers.
 */
export interface IEventBus {
  publish(event: IEvent): Promise<void>;
  publishAll(events: IEvent[]): Promise<void>;
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Constructor type for commands/queries/events.
 * Used for handler registration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Handler registration metadata.
 */
export interface HandlerMetadata {
  messageType: Constructor;
  handlerName: string;
}
