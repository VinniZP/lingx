/**
 * Type-safe handler registration helpers.
 *
 * These functions provide compile-time verification that handlers match
 * their commands/queries. The handler class parameter is only used for
 * type-checking and is not used at runtime.
 */

import type {
  Constructor,
  ICommand,
  ICommandHandler,
  IEvent,
  IEventHandler,
  IQuery,
  IQueryHandler,
} from './interfaces.js';

/**
 * Registration result containing the class constructor and handler name.
 */
export interface HandlerRegistration<T> {
  readonly messageClass: Constructor<T>;
  readonly handlerName: string;
}

/**
 * Type-safe command handler registration.
 *
 * Verifies at compile time that the handler matches the command's expected result type.
 * The handlerClass parameter is only used for type-checking and is discarded at runtime.
 *
 * @example
 * ```typescript
 * // Type-safe: if handler doesn't match command, TypeScript errors
 * const registration = defineCommandHandler(
 *   CreateUserCommand,
 *   CreateUserHandler,
 *   'createUserHandler'
 * );
 *
 * // Error: DeleteUserHandler doesn't implement ICommandHandler<CreateUserCommand, User>
 * const wrongRegistration = defineCommandHandler(
 *   CreateUserCommand,
 *   DeleteUserHandler, // ❌ Compile error!
 *   'deleteUserHandler'
 * );
 * ```
 */
export function defineCommandHandler<
  TResult,
  TCommand extends ICommand<TResult>,
  THandler extends ICommandHandler<TCommand, TResult>,
>(
  commandClass: Constructor<TCommand>,
  _handlerClass: Constructor<THandler>,
  handlerName: string
): HandlerRegistration<TCommand> {
  return { messageClass: commandClass, handlerName };
}

/**
 * Type-safe query handler registration.
 *
 * Verifies at compile time that the handler matches the query's expected result type.
 * The handlerClass parameter is only used for type-checking and is discarded at runtime.
 *
 * @example
 * ```typescript
 * // Type-safe: if handler doesn't match query, TypeScript errors
 * const registration = defineQueryHandler(
 *   GetUserQuery,
 *   GetUserHandler,
 *   'getUserHandler'
 * );
 * ```
 */
export function defineQueryHandler<
  TResult,
  TQuery extends IQuery<TResult>,
  THandler extends IQueryHandler<TQuery, TResult>,
>(
  queryClass: Constructor<TQuery>,
  _handlerClass: Constructor<THandler>,
  handlerName: string
): HandlerRegistration<TQuery> {
  return { messageClass: queryClass, handlerName };
}

/**
 * Type-safe event handler registration.
 *
 * Verifies at compile time that the handler can handle the event type.
 * The handlerClass parameter is only used for type-checking and is discarded at runtime.
 *
 * @example
 * ```typescript
 * const registration = defineEventHandler(
 *   UserCreatedEvent,
 *   UserCreatedNotificationHandler,
 *   'userCreatedNotificationHandler'
 * );
 * ```
 */
export function defineEventHandler<TEvent extends IEvent, THandler extends IEventHandler<TEvent>>(
  eventClass: Constructor<TEvent>,
  _handlerClass: Constructor<THandler>,
  handlerName: string
): HandlerRegistration<TEvent> {
  return { messageClass: eventClass, handlerName };
}

/**
 * Batch registration helper for registering multiple handlers at once.
 *
 * @example
 * ```typescript
 * const registrations = [
 *   defineCommandHandler(CreateUserCommand, CreateUserHandler, 'createUserHandler'),
 *   defineCommandHandler(UpdateUserCommand, UpdateUserHandler, 'updateUserHandler'),
 * ];
 *
 * registerCommandHandlers(commandBus, registrations);
 * ```
 */
export function registerCommandHandlers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commandBus: { register: (cls: any, name: string) => void },
  registrations: HandlerRegistration<ICommand<unknown>>[]
): void {
  for (const { messageClass, handlerName } of registrations) {
    commandBus.register(messageClass, handlerName);
  }
}

export function registerQueryHandlers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryBus: { register: (cls: any, name: string) => void },
  registrations: HandlerRegistration<IQuery<unknown>>[]
): void {
  for (const { messageClass, handlerName } of registrations) {
    queryBus.register(messageClass, handlerName);
  }
}

export function registerEventHandlers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventBus: { register: (cls: any, name: string) => void },
  registrations: HandlerRegistration<IEvent>[]
): void {
  for (const { messageClass, handlerName } of registrations) {
    eventBus.register(messageClass, handlerName);
  }
}
