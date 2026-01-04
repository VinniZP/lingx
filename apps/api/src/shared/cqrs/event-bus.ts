import type { AwilixContainer } from 'awilix';
import type { Constructor, IEvent, IEventBus, IEventHandler } from './interfaces.js';

/**
 * EventBus publishes domain events to all registered handlers.
 *
 * Events represent something that has happened in the system.
 * Multiple handlers can subscribe to the same event type.
 * Handlers execute asynchronously (fire-and-forget for side effects).
 *
 * @example
 * ```typescript
 * // In command handler
 * await eventBus.publish(new TranslationUpdatedEvent(translation, userId));
 *
 * // Event handlers for side effects:
 * // - RealTimeSyncHandler: Broadcast via WebSocket
 * // - AuditLogHandler: Record change history
 * // - WebhookHandler: Notify external systems
 * ```
 */
export class EventBus implements IEventBus {
  private readonly handlers = new Map<Constructor, string[]>();

  constructor(private readonly container: AwilixContainer) {}

  /**
   * Register a handler for an event type.
   * Multiple handlers can be registered for the same event.
   * @param eventType - The event class constructor
   * @param handlerName - The container registration name for the handler
   */
  register<TEvent extends IEvent>(eventType: Constructor<TEvent>, handlerName: string): void {
    const existing = this.handlers.get(eventType) ?? [];
    if (existing.includes(handlerName)) {
      throw new Error(`Handler ${handlerName} already registered for event: ${eventType.name}`);
    }
    this.handlers.set(eventType, [...existing, handlerName]);
  }

  /**
   * Publish an event to all registered handlers.
   * Handlers execute concurrently and errors are logged but don't propagate.
   * @param event - The event instance to publish
   */
  async publish(event: IEvent): Promise<void> {
    const eventType = event.constructor as Constructor;
    const handlerNames = this.handlers.get(eventType) ?? [];

    if (handlerNames.length === 0) {
      // No handlers registered - this is fine, event is just ignored
      return;
    }

    // Execute all handlers concurrently
    const results = await Promise.allSettled(
      handlerNames.map(async (handlerName) => {
        const handler = this.container.resolve<IEventHandler<IEvent>>(handlerName);
        return handler.handle(event);
      })
    );

    // Log any failures (but don't throw - events are fire-and-forget)
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        console.error(
          `Event handler ${handlerNames[i]} failed for ${eventType.name}:`,
          result.reason
        );
      }
    }
  }

  /**
   * Publish multiple events.
   * Events are published sequentially to maintain ordering.
   * @param events - The events to publish
   */
  async publishAll(events: IEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Get all handler names registered for an event type.
   */
  getHandlers(eventType: Constructor): string[] {
    return this.handlers.get(eventType) ?? [];
  }

  /**
   * Get all registered event types.
   */
  getRegisteredEvents(): Constructor[] {
    return Array.from(this.handlers.keys());
  }
}
