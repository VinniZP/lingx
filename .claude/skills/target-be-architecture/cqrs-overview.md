# CQRS-lite Overview

Command Query Responsibility Segregation separates read and write operations into distinct models.

## CQRS vs CQRS-lite

| Full CQRS                     | CQRS-lite (Our Approach) |
| ----------------------------- | ------------------------ |
| Separate read/write databases | Single database          |
| Event sourcing                | Traditional persistence  |
| Complex infrastructure        | Simple implementation    |
| Eventually consistent         | Immediately consistent   |

CQRS-lite gives us the organizational benefits without infrastructure complexity.

## Core Components

### Commands

Commands represent intent to change state. They are:

- Named as imperative verbs: `CreateProject`, `UpdateTranslation`
- Immutable data objects
- Validated before execution
- Always produce side effects (events)

```typescript
// Commands carry all data needed to execute
export class CreateProjectCommand {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly sourceLanguage: string,
    public readonly userId: string
  ) {}
}
```

### Queries

Queries represent requests for data. They are:

- Named as questions: `GetProject`, `ListTranslations`
- Immutable data objects
- Never modify state
- Can be cached

```typescript
// Queries carry parameters for data retrieval
export class GetProjectQuery {
  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}
```

### Events

Events represent facts that happened. They are:

- Named in past tense: `ProjectCreated`, `TranslationUpdated`
- Immutable records of state changes
- Published after successful command execution
- Consumed by multiple handlers for side effects

```typescript
// Events record what happened
export class ProjectCreatedEvent implements IDomainEvent {
  public readonly occurredAt = new Date();

  constructor(
    public readonly project: Project,
    public readonly userId: string
  ) {}
}
```

## Bus Pattern

### CommandBus

Dispatches commands to their handlers:

```typescript
interface ICommandBus {
  execute<T>(command: ICommand): Promise<T>;
  register<T extends ICommand>(commandType: Constructor<T>, handler: ICommandHandler<T>): void;
}

// Usage
const project = await commandBus.execute(
  new CreateProjectCommand('My Project', 'my-project', 'en', userId)
);
```

### QueryBus

Dispatches queries to their handlers:

```typescript
interface IQueryBus {
  execute<T>(query: IQuery): Promise<T>;
  register<T extends IQuery>(queryType: Constructor<T>, handler: IQueryHandler<T>): void;
}

// Usage
const project = await queryBus.execute(new GetProjectQuery(projectId, userId));
```

### EventBus

Publishes events to multiple subscribers:

```typescript
interface IEventBus {
  publish(event: IDomainEvent): Promise<void>;
  subscribe<T extends IDomainEvent>(eventType: Constructor<T>, handler: IEventHandler<T>): void;
}

// Usage - publish from command handler
await eventBus.publish(new ProjectCreatedEvent(project, userId));

// Handlers react independently
// - AuditLogHandler: Records to audit table
// - WebhookHandler: Sends to external systems
// - RealTimeSyncHandler: Broadcasts via WebSocket
```

## Handler Interfaces

```typescript
interface ICommandHandler<T extends ICommand> {
  execute(command: T): Promise<unknown>;
}

interface IQueryHandler<T extends IQuery> {
  execute(query: T): Promise<unknown>;
}

interface IEventHandler<T extends IDomainEvent> {
  handle(event: T): Promise<void>;
}
```

## When to Use CQRS-lite

### Good Fit

- **Read/write asymmetry** - Different query patterns than write patterns
- **Complex domain logic** - Business rules that benefit from explicit commands
- **Audit requirements** - Need to track who did what and when
- **Real-time features** - Events enable WebSocket broadcasting
- **Multiple side effects** - Actions trigger notifications, logs, webhooks

### Not Needed

- Simple CRUD with no business logic
- Read-only applications
- Prototypes or MVPs
- Single-user applications

## Lingx Use Cases

| Feature             | Commands             | Queries              | Events                          |
| ------------------- | -------------------- | -------------------- | ------------------------------- |
| Translation editing | UpdateTranslation    | GetTranslations      | TranslationUpdated → WebSocket  |
| Key management      | CreateKey, DeleteKey | ListKeys, SearchKeys | KeyCreated → Reindex            |
| AI translation      | RequestAITranslation | GetAIStatus          | AITranslationCompleted → Notify |
| Import/Export       | ImportTranslations   | ExportTranslations   | ImportCompleted → Notify        |
| Collaboration       | FocusKey, JoinRoom   | GetPresence          | UserFocused → Broadcast         |

## Testing Benefits

```typescript
// Test command handler in isolation
describe('UpdateTranslationHandler', () => {
  it('updates translation and emits event', async () => {
    const repo = mock<TranslationRepository>();
    const eventBus = mock<EventBus>();
    const handler = new UpdateTranslationHandler(repo, eventBus);

    repo.update.mockResolvedValue(mockTranslation);

    const result = await handler.execute(
      new UpdateTranslationCommand('key1', 'en', 'Hello', 'user1')
    );

    expect(repo.update).toHaveBeenCalledWith({
      keyId: 'key1',
      language: 'en',
      value: 'Hello',
    });
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(TranslationUpdatedEvent));
  });
});
```

## Implementation Strategy

### Phase 1: Command/Query Separation

1. Create CommandBus and QueryBus
2. Define commands and queries as classes
3. Create handlers for each
4. Wire up in DI container

### Phase 2: Event-Driven Side Effects

1. Create EventBus
2. Define domain events
3. Move side effects to event handlers
4. Emit events from command handlers

### Phase 3: Real-time Integration

1. Create WebSocket event handlers
2. Subscribe to relevant events
3. Broadcast to connected clients
4. Handle presence events

## Best Practices

1. **One handler per command/query** - Single responsibility
2. **Handlers call repositories** - Not Prisma directly
3. **Commands always emit events** - Enable side effects
4. **Events are immutable** - Include timestamp
5. **Queries never modify state** - Pure reads
6. **Keep handlers thin** - Delegate to domain services if complex
