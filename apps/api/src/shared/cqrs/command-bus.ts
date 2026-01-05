import type { AwilixContainer } from 'awilix';
import type {
  Constructor,
  ICommand,
  ICommandBus,
  ICommandHandler,
  InferCommandResult,
} from './interfaces.js';

/**
 * CommandBus dispatches commands to their registered handlers.
 *
 * Commands represent write operations that change system state.
 * Each command type has exactly one handler.
 *
 * @example
 * ```typescript
 * // In route handler
 * const result = await commandBus.execute(
 *   new UpdateTranslationCommand(keyId, language, value, userId)
 * );
 * ```
 */
export class CommandBus implements ICommandBus {
  private readonly handlers = new Map<Constructor, string>();

  constructor(private readonly container: AwilixContainer) {}

  /**
   * Register a handler for a command type.
   * @param commandType - The command class constructor
   * @param handlerName - The container registration name for the handler
   */
  register<TResult, TCommand extends ICommand<TResult>>(
    commandType: Constructor<TCommand>,
    handlerName: string
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for command: ${commandType.name}`);
    }
    this.handlers.set(commandType, handlerName);
  }

  /**
   * Execute a command through its registered handler.
   * Result type is automatically inferred from the command's TResult type parameter.
   *
   * @param command - The command instance to execute
   * @returns The result from the command handler (type inferred from command)
   * @throws Error if no handler is registered for the command type
   */
  async execute<TCommand extends ICommand<unknown>>(
    command: TCommand
  ): Promise<InferCommandResult<TCommand>> {
    const commandType = command.constructor as Constructor;
    const handlerName = this.handlers.get(commandType);

    if (!handlerName) {
      throw new Error(`No handler registered for command: ${commandType.name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = this.container.resolve<ICommandHandler<any, any>>(handlerName);
    return handler.execute(command) as Promise<InferCommandResult<TCommand>>;
  }

  /**
   * Check if a handler is registered for a command type.
   */
  hasHandler(commandType: Constructor): boolean {
    return this.handlers.has(commandType);
  }

  /**
   * Get all registered command types.
   */
  getRegisteredCommands(): Constructor[] {
    return Array.from(this.handlers.keys());
  }
}
