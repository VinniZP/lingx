import type { AwilixContainer } from 'awilix';
import type { Constructor, ICommand, ICommandBus, ICommandHandler } from './interfaces.js';

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
  register<TCommand extends ICommand>(
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
   * @param command - The command instance to execute
   * @returns The result from the command handler
   * @throws Error if no handler is registered for the command type
   */
  async execute<TResult>(command: ICommand): Promise<TResult> {
    const commandType = command.constructor as Constructor;
    const handlerName = this.handlers.get(commandType);

    if (!handlerName) {
      throw new Error(`No handler registered for command: ${commandType.name}`);
    }

    const handler = this.container.resolve<ICommandHandler<ICommand, TResult>>(handlerName);
    return handler.execute(command);
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
