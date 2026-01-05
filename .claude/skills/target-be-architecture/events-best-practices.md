# Events Best Practices

Guidelines for designing and using domain events in the CQRS-lite architecture.

## When to Use Events

| Scenario                 | Use Event? | Reason                                      |
| ------------------------ | ---------- | ------------------------------------------- |
| Activity logging         | Yes        | Side effect, shouldn't block main operation |
| Real-time sync           | Yes        | Broadcast to WebSocket clients              |
| Webhooks                 | Yes        | External notification                       |
| Invalidate cache         | Yes        | Secondary system update                     |
| Update related aggregate | Maybe      | Consider if it needs consistency            |
| Validation before save   | No         | Use query/service instead                   |
| Return data to caller    | No         | Use command result                          |

## Event Design

### Naming Convention

Events use past tense - they describe something that **has happened**:

```typescript
// GOOD - past tense
EnvironmentCreatedEvent;
TranslationUpdatedEvent;
BranchMergedEvent;
UserJoinedRoomEvent;

// BAD - imperative
CreateEnvironmentEvent; // This is a command, not an event
UpdateTranslationEvent;
```

### Event Structure

```typescript
export class EnvironmentCreatedEvent implements IEvent {
  // Required: timestamp for ordering and debugging
  public readonly occurredAt = new Date();

  constructor(
    // Include the full entity (not just ID) for handlers that need details
    public readonly environment: EnvironmentWithBranch,
    // Include actor for audit purposes
    public readonly userId: string
  ) {}
}
```

### What to Include in Payload

**Include:**

- Full entity snapshot (for handlers that need details)
- Actor userId (for audit)
- Previous values for updates (for change tracking)

**Don't include:**

- Computed data that handlers can derive
- Sensitive data not needed by handlers
- Large blobs (use references instead)

```typescript
// GOOD - includes what handlers need
export class EnvironmentUpdatedEvent implements IEvent {
  public readonly occurredAt = new Date();

  constructor(
    public readonly environment: EnvironmentWithBranch,
    public readonly userId: string,
    public readonly previousName?: string // For activity log "renamed from X to Y"
  ) {}
}

// BAD - forces handlers to make additional queries
export class EnvironmentUpdatedEvent implements IEvent {
  constructor(
    public readonly environmentId: string, // Handler needs full entity!
    public readonly userId: string
  ) {}
}
```

## Publishing Events

### After Database Operations

Always publish events AFTER the database operation succeeds:

```typescript
async execute(command: CreateCommand): Promise<Result> {
  // 1. Validate
  // 2. Execute database operation
  const result = await this.repository.create(command);

  // 3. Publish event AFTER success
  await this.eventBus.publish(new EntityCreatedEvent(result, command.userId));

  return result;
}
```

### After Transactions

For multi-step operations, publish AFTER transaction commits:

```typescript
async execute(command: CreateProjectCommand): Promise<Project> {
  // Transaction ensures atomicity
  const project = await this.prisma.$transaction(async (tx) => {
    const proj = await tx.project.create({ data: { ... } });
    await tx.space.create({ data: { projectId: proj.id, ... } });
    await tx.projectMember.create({ data: { projectId: proj.id, ... } });
    return proj;
  });

  // Events AFTER transaction - data is committed
  await this.eventBus.publish(new ProjectCreatedEvent(project, command.userId));

  return project;
}
```

### Multiple Events

Use `publishAll` for ordered event sequences:

```typescript
// Events are published sequentially to maintain ordering
await this.eventBus.publishAll([
  new TranslationUpdatedEvent(translation, userId),
  new QualityScoreRecalculatedEvent(translation.id),
]);
```

## Event Handlers

### Handler Structure

```typescript
export class EnvironmentCreatedActivityHandler implements IEventHandler<EnvironmentCreatedEvent> {
  constructor(private readonly activityService: ActivityService) {}

  async handle(event: EnvironmentCreatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'environment_create',
      projectId: event.environment.projectId,
      branchId: event.environment.branchId,
      userId: event.userId,
      metadata: {
        environmentName: event.environment.name,
        environmentId: event.environment.id,
      },
      changes: [
        {
          entityType: 'environment',
          entityId: event.environment.id,
          newValue: event.environment.name,
        },
      ],
    });
  }
}
```

### Error Handling

Event handlers should be resilient - one failure shouldn't affect others:

```typescript
// EventBus handles this automatically with Promise.allSettled
// Errors are logged but don't propagate to the command
```

For critical handlers that MUST succeed, consider:

1. Retry logic within the handler
2. Outbox pattern for guaranteed delivery
3. Idempotency checks

### Idempotency

Design handlers to be idempotent (safe to run multiple times):

```typescript
async handle(event: TranslationUpdatedEvent): Promise<void> {
  // GOOD - upsert is idempotent
  await this.cache.set(
    `translation:${event.translation.id}`,
    event.translation
  );
}

async handle(event: ProjectCreatedEvent): Promise<void> {
  // GOOD - check before insert
  const existing = await this.analytics.findByProjectId(event.project.id);
  if (!existing) {
    await this.analytics.create({ projectId: event.project.id });
  }
}
```

## Registration

```typescript
// In module index.ts
export function registerEnvironmentModule(container: AwilixContainer): void {
  // Register event handlers
  container.register({
    environmentCreatedActivityHandler: asClass(EnvironmentCreatedActivityHandler).singleton(),
    environmentUpdatedActivityHandler: asClass(EnvironmentUpdatedActivityHandler).singleton(),
  });

  // Register with EventBus
  const eventBus = container.resolve<EventBus>('eventBus');
  eventBus.register(EnvironmentCreatedEvent, 'environmentCreatedActivityHandler');
  eventBus.register(EnvironmentUpdatedEvent, 'environmentUpdatedActivityHandler');
}
```

## Common Event Types

### CRUD Events

```typescript
// Created
EnvironmentCreatedEvent;
ProjectCreatedEvent;
KeyCreatedEvent;

// Updated
EnvironmentUpdatedEvent;
TranslationUpdatedEvent; // Most common in translation management

// Deleted
EnvironmentDeletedEvent;
KeyDeletedEvent;
```

### Action Events

```typescript
// Complex operations
BranchMergedEvent;
TranslationsImportedEvent;
TranslationsExportedEvent;
AITranslationCompletedEvent;

// User actions
TranslationApprovedEvent;
TranslationRejectedEvent;
```

### Collaboration Events

```typescript
// Real-time presence
UserJoinedRoomEvent;
UserLeftRoomEvent;
UserFocusedKeyEvent;
UserBlurredKeyEvent;
```

## Testing Events

```typescript
describe('CreateEnvironmentHandler', () => {
  it('publishes EnvironmentCreatedEvent on success', async () => {
    const mockEventBus = { publish: vi.fn() };
    const handler = new CreateEnvironmentHandler(repo, mockEventBus, accessService);

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: expect.objectContaining({ name: 'Production' }),
        userId: 'user-1',
      })
    );
  });

  it('does not publish event on validation failure', async () => {
    const mockEventBus = { publish: vi.fn() };
    repo.findBySlug.mockResolvedValue(existingEnv); // Slug exists

    await expect(handler.execute(command)).rejects.toThrow();

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
```

## Anti-Patterns

### Events Inside Transactions

```typescript
// BAD - event might be published for rolled-back data
await this.prisma.$transaction(async (tx) => {
  const entity = await tx.entity.create({ ... });
  await this.eventBus.publish(new EntityCreatedEvent(entity));  // NO!
  // If next operation fails, transaction rolls back but event was published
  await tx.related.create({ ... });
});
```

### Events for Return Values

```typescript
// BAD - using events to return data
const handler = {
  result: null,
  async handle(event) {
    this.result = await computeExpensive(event);
  }
};
await eventBus.publish(event);
return handler.result;  // Race condition, unclear data flow

// GOOD - return from command directly
async execute(command) {
  const result = await this.compute(command);
  await this.eventBus.publish(new ComputedEvent(result));
  return result;
}
```

### Synchronous Dependencies Between Handlers

```typescript
// BAD - handler B depends on handler A completing first
// EventBus runs handlers concurrently!
```

If you need ordering, either:

1. Combine into one handler
2. Have handler A publish a second event for handler B
3. Use a saga/process manager
