// Core interfaces
export type {
  Constructor,
  ICommand,
  ICommandBus,
  ICommandHandler,
  IEvent,
  IEventBus,
  IEventHandler,
  IQuery,
  IQueryBus,
  IQueryHandler,
  // Type inference helpers
  InferCommandResult,
  InferQueryResult,
} from './interfaces.js';

// Bus implementations
export { CommandBus } from './command-bus.js';
export { EventBus } from './event-bus.js';
export { QueryBus } from './query-bus.js';

// Type-safe registration helpers
export {
  defineCommandHandler,
  defineEventHandler,
  defineQueryHandler,
  registerCommandHandlers,
  registerEventHandlers,
  registerQueryHandlers,
  type HandlerRegistration,
} from './registration.js';
