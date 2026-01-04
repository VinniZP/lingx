/**
 * CQRS-lite Infrastructure Interfaces
 *
 * These interfaces define the contract for Commands, Queries, Events,
 * and their respective handlers in the Lingx backend.
 */

// ============================================================================
// Base Interfaces
// ============================================================================

/**
 * Marker interface for commands (write operations).
 * Commands change state and may emit events.
 */
export interface ICommand {
  readonly __brand: 'command';
}

/**
 * Marker interface for queries (read operations).
 * Queries are pure reads with no side effects.
 */
export interface IQuery {
  readonly __brand: 'query';
}

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
 * @template TResult - The return type after command execution
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

/**
 * Handler for a specific query type.
 * @template TQuery - The query type this handler processes
 * @template TResult - The data returned by the query
 */
export interface IQueryHandler<TQuery extends IQuery, TResult> {
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
 */
export interface ICommandBus {
  execute<TResult>(command: ICommand): Promise<TResult>;
}

/**
 * Query bus dispatches queries to their handlers.
 */
export interface IQueryBus {
  execute<TResult>(query: IQuery): Promise<TResult>;
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
