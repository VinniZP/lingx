# Events

Domain events represent facts that happened in the system. They enable decoupled side effects and real-time collaboration.

## Event Structure

### Naming Convention

Events use past tense describing what happened:

| Domain        | Events                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| Project       | `ProjectCreated`, `ProjectUpdated`, `ProjectDeleted`, `ProjectArchived`   |
| Translation   | `TranslationUpdated`, `TranslationDeleted`, `TranslationImported`         |
| Key           | `KeyCreated`, `KeyRenamed`, `KeyDeleted`, `KeyMoved`                      |
| Collaboration | `UserJoinedRoom`, `UserLeftRoom`, `UserFocusedKey`, `UserBlurredKey`      |
| AI            | `AITranslationRequested`, `AITranslationCompleted`, `AITranslationFailed` |

### Event Interface

```typescript
// shared/domain/events.ts
export interface IDomainEvent {
  readonly occurredAt: Date;
}

export interface IAggregateEvent extends IDomainEvent {
  readonly aggregateId: string;
  readonly aggregateType: string;
}
```

### Event Classes

```typescript
// modules/translation/events/translation-updated.event.ts
export class TranslationUpdatedEvent implements IAggregateEvent {
  public readonly occurredAt = new Date();
  public readonly aggregateType = 'Translation';

  constructor(
    public readonly aggregateId: string, // translationId
    public readonly translation: Translation,
    public readonly branchId: string,
    public readonly userId: string,
    public readonly previousValue?: string
  ) {}
}

// modules/collaboration/events/user-focused-key.event.ts
export class UserFocusedKeyEvent implements IDomainEvent {
  public readonly occurredAt = new Date();

  constructor(
    public readonly branchId: string,
    public readonly keyId: string,
    public readonly userId: string,
    public readonly userName: string
  ) {}
}
```

## EventBus Implementation

```typescript
// shared/cqrs/event-bus.ts
type Constructor<T> = new (...args: any[]) => T;

export interface IEventHandler<T extends IDomainEvent> {
  handle(event: T): Promise<void>;
}

export class EventBus {
  private handlers = new Map<string, string[]>();

  constructor(private container: AwilixContainer) {}

  subscribe<T extends IDomainEvent>(eventType: Constructor<T>, handlerName: string): void {
    const existing = this.handlers.get(eventType.name) || [];
    this.handlers.set(eventType.name, [...existing, handlerName]);
  }

  async publish(event: IDomainEvent): Promise<void> {
    const handlerNames = this.handlers.get(event.constructor.name) || [];

    // Execute all handlers in parallel
    await Promise.all(
      handlerNames.map(async (name) => {
        try {
          const handler = this.container.resolve<IEventHandler<typeof event>>(name);
          await handler.handle(event);
        } catch (error) {
          // Log error but don't fail other handlers
          console.error(`Event handler ${name} failed:`, error);
        }
      })
    );
  }
}
```

## Event Handler Patterns

### Real-time Sync Handler

```typescript
// modules/translation/handlers/realtime-sync.handler.ts
export class TranslationRealtimeSyncHandler implements IEventHandler<TranslationUpdatedEvent> {
  constructor(private wsServer: WebSocketServer) {}

  async handle(event: TranslationUpdatedEvent): Promise<void> {
    // Broadcast to all users viewing this branch
    await this.wsServer.broadcast(`branch:${event.branchId}`, {
      type: 'translation:updated',
      payload: {
        keyId: event.translation.keyId,
        language: event.translation.language,
        value: event.translation.value,
        updatedBy: event.userId,
      },
    });
  }
}
```

### Audit Log Handler

```typescript
// modules/shared/handlers/audit-log.handler.ts
export class AuditLogHandler implements IEventHandler<IAggregateEvent> {
  constructor(private auditRepo: AuditRepository) {}

  async handle(event: IAggregateEvent): Promise<void> {
    await this.auditRepo.create({
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.constructor.name,
      userId: (event as any).userId,
      payload: JSON.stringify(event),
      occurredAt: event.occurredAt,
    });
  }
}
```

### Webhook Handler

```typescript
// modules/shared/handlers/webhook.handler.ts
export class WebhookHandler implements IEventHandler<IDomainEvent> {
  constructor(
    private webhookRepo: WebhookRepository,
    private queue: Queue
  ) {}

  async handle(event: IDomainEvent): Promise<void> {
    // Find webhooks subscribed to this event type
    const webhooks = await this.webhookRepo.findByEventType(event.constructor.name);

    // Queue webhook deliveries
    for (const webhook of webhooks) {
      await this.queue.add('webhook:deliver', {
        webhookId: webhook.id,
        url: webhook.url,
        payload: event,
        secret: webhook.secret,
      });
    }
  }
}
```

### Presence Handler

```typescript
// modules/collaboration/handlers/presence.handler.ts
export class PresenceHandler implements IEventHandler<UserFocusedKeyEvent> {
  constructor(
    private wsServer: WebSocketServer,
    private presenceRepo: PresenceRepository
  ) {}

  async handle(event: UserFocusedKeyEvent): Promise<void> {
    // Update presence in database
    await this.presenceRepo.upsert({
      branchId: event.branchId,
      userId: event.userId,
      focusedKeyId: event.keyId,
      updatedAt: event.occurredAt,
    });

    // Broadcast to branch room
    await this.wsServer.broadcast(`branch:${event.branchId}`, {
      type: 'presence:focus',
      payload: {
        userId: event.userId,
        userName: event.userName,
        keyId: event.keyId,
      },
    });
  }
}
```

### Background Job Handler

```typescript
// modules/ai/handlers/ai-translation.handler.ts
export class AITranslationRequestHandler implements IEventHandler<AITranslationRequestedEvent> {
  constructor(private queue: Queue) {}

  async handle(event: AITranslationRequestedEvent): Promise<void> {
    // Queue AI translation job
    await this.queue.add(
      'ai:translate',
      {
        keyId: event.keyId,
        sourceLanguage: event.sourceLanguage,
        targetLanguages: event.targetLanguages,
        sourceValue: event.sourceValue,
        userId: event.userId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );
  }
}
```

## Event Registration

```typescript
// shared/container/index.ts
export function createAppContainer() {
  const container = createContainer();

  // Register event handlers
  container.register({
    translationRealtimeHandler: asClass(TranslationRealtimeSyncHandler).scoped(),
    auditLogHandler: asClass(AuditLogHandler).scoped(),
    webhookHandler: asClass(WebhookHandler).scoped(),
    presenceHandler: asClass(PresenceHandler).scoped(),
    aiTranslationHandler: asClass(AITranslationRequestHandler).scoped(),
  });

  // Register EventBus with subscriptions
  container.register({
    eventBus: asFunction(({ container }) => {
      const bus = new EventBus(container);

      // Translation events
      bus.subscribe(TranslationUpdatedEvent, 'translationRealtimeHandler');
      bus.subscribe(TranslationUpdatedEvent, 'auditLogHandler');
      bus.subscribe(TranslationUpdatedEvent, 'webhookHandler');

      // Key events
      bus.subscribe(KeyCreatedEvent, 'auditLogHandler');
      bus.subscribe(KeyCreatedEvent, 'webhookHandler');

      // Presence events
      bus.subscribe(UserFocusedKeyEvent, 'presenceHandler');
      bus.subscribe(UserBlurredKeyEvent, 'presenceHandler');

      // AI events
      bus.subscribe(AITranslationRequestedEvent, 'aiTranslationHandler');

      return bus;
    }).singleton(),
  });

  return container;
}
```

## WebSocket Integration

### WebSocket Server Setup

```typescript
// websocket/server.ts
export class WebSocketServer {
  private rooms = new Map<string, Set<WebSocket>>();
  private redis: Redis;

  constructor(fastify: FastifyInstance, redis: Redis) {
    this.redis = redis;
    this.setupSubscriptions();
  }

  join(roomId: string, socket: WebSocket): void {
    const room = this.rooms.get(roomId) || new Set();
    room.add(socket);
    this.rooms.set(roomId, room);
  }

  leave(roomId: string, socket: WebSocket): void {
    const room = this.rooms.get(roomId);
    room?.delete(socket);
  }

  async broadcast(roomId: string, message: object): Promise<void> {
    // Publish to Redis for multi-instance support
    await this.redis.publish(`ws:${roomId}`, JSON.stringify(message));
  }

  private setupSubscriptions(): void {
    const subscriber = this.redis.duplicate();

    subscriber.psubscribe('ws:*', (err) => {
      if (err) console.error('Redis subscribe error:', err);
    });

    subscriber.on('pmessage', (pattern, channel, message) => {
      const roomId = channel.replace('ws:', '');
      const room = this.rooms.get(roomId);

      if (room) {
        const data = JSON.parse(message);
        for (const socket of room) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));
          }
        }
      }
    });
  }
}
```

### Room Management

```typescript
// websocket/handlers.ts
export function setupWebSocketHandlers(wsServer: WebSocketServer, container: AwilixContainer) {
  return {
    async onMessage(socket: WebSocket, data: WebSocketMessage) {
      const commandBus = container.resolve<CommandBus>('commandBus');
      const eventBus = container.resolve<EventBus>('eventBus');

      switch (data.type) {
        case 'join':
          wsServer.join(`branch:${data.branchId}`, socket);
          await eventBus.publish(
            new UserJoinedRoomEvent(data.branchId, data.userId, data.userName)
          );
          break;

        case 'leave':
          wsServer.leave(`branch:${data.branchId}`, socket);
          await eventBus.publish(new UserLeftRoomEvent(data.branchId, data.userId));
          break;

        case 'focus':
          await eventBus.publish(
            new UserFocusedKeyEvent(data.branchId, data.keyId, data.userId, data.userName)
          );
          break;

        case 'blur':
          await eventBus.publish(new UserBlurredKeyEvent(data.branchId, data.userId));
          break;
      }
    },
  };
}
```

## Testing Events

```typescript
describe('TranslationRealtimeSyncHandler', () => {
  let handler: TranslationRealtimeSyncHandler;
  let wsServer: MockProxy<WebSocketServer>;

  beforeEach(() => {
    wsServer = mock<WebSocketServer>();
    handler = new TranslationRealtimeSyncHandler(wsServer);
  });

  it('broadcasts translation update to branch room', async () => {
    const event = new TranslationUpdatedEvent('trans1', mockTranslation, 'branch1', 'user1');

    await handler.handle(event);

    expect(wsServer.broadcast).toHaveBeenCalledWith(
      'branch:branch1',
      expect.objectContaining({
        type: 'translation:updated',
        payload: expect.objectContaining({
          keyId: mockTranslation.keyId,
          language: mockTranslation.language,
        }),
      })
    );
  });
});
```

## Best Practices

1. **Events are immutable** - Never modify after creation
2. **Include timestamp** - `occurredAt` for ordering
3. **Multiple handlers OK** - Events can have many subscribers
4. **Handlers are independent** - Don't rely on order
5. **Handle failures gracefully** - One handler failing shouldn't stop others
6. **Use queues for heavy work** - Don't block event processing
7. **Include enough context** - Handlers shouldn't need to fetch data
