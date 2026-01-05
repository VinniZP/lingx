# Commands

Commands represent intentions to change state. They encapsulate all data needed to execute a write operation.

## Command Structure

### Naming Convention

Commands use imperative verb + noun:

| Domain        | Commands                                                            |
| ------------- | ------------------------------------------------------------------- |
| Project       | `CreateProject`, `UpdateProject`, `DeleteProject`, `ArchiveProject` |
| Translation   | `UpdateTranslation`, `BulkUpdateTranslations`, `DeleteTranslation`  |
| Key           | `CreateKey`, `RenameKey`, `DeleteKey`, `MoveKey`                    |
| Import        | `ImportTranslations`, `ValidateImport`                              |
| Collaboration | `JoinRoom`, `LeaveRoom`, `FocusKey`, `BlurKey`                      |

### Command Class

```typescript
// modules/project/commands/create-project.command.ts
export class CreateProjectCommand {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly sourceLanguage: string,
    public readonly targetLanguages: string[],
    public readonly userId: string
  ) {}
}
```

**Properties:**

- All fields are `readonly` (immutable)
- Include all data needed to execute
- Include `userId` for authorization and audit
- No methods, just data

## CommandBus Implementation

```typescript
// shared/cqrs/command-bus.ts
import { AwilixContainer } from 'awilix';

type Constructor<T> = new (...args: any[]) => T;

export interface ICommandHandler<T> {
  execute(command: T): Promise<unknown>;
}

export class CommandBus {
  private handlers = new Map<string, string>();

  constructor(private container: AwilixContainer) {}

  register<T>(commandType: Constructor<T>, handlerName: string): void {
    this.handlers.set(commandType.name, handlerName);
  }

  async execute<TResult>(command: object): Promise<TResult> {
    const handlerName = this.handlers.get(command.constructor.name);

    if (!handlerName) {
      throw new Error(`No handler for ${command.constructor.name}`);
    }

    const handler = this.container.resolve<ICommandHandler<typeof command>>(handlerName);

    return handler.execute(command) as Promise<TResult>;
  }
}
```

## Command Handler Pattern

### Basic Handler

```typescript
// modules/project/handlers/create-project.handler.ts
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
  constructor(
    private projectRepo: ProjectRepository,
    private accessService: AccessService,
    private eventBus: EventBus
  ) {}

  async execute(cmd: CreateProjectCommand): Promise<Project> {
    // 1. Validate business rules
    const existingSlug = await this.projectRepo.findBySlug(cmd.slug);
    if (existingSlug) {
      throw new ConflictError('Project slug already exists');
    }

    // 2. Execute operation
    const project = await this.projectRepo.create({
      name: cmd.name,
      slug: cmd.slug,
      sourceLanguage: cmd.sourceLanguage,
      ownerId: cmd.userId,
    });

    // 3. Create default branch
    await this.projectRepo.createBranch(project.id, 'main', true);

    // 4. Add languages
    for (const lang of cmd.targetLanguages) {
      await this.projectRepo.addLanguage(project.id, lang);
    }

    // 5. Grant owner access
    await this.accessService.grantAccess(cmd.userId, project.id, 'owner');

    // 6. Emit event for side effects
    await this.eventBus.publish(new ProjectCreatedEvent(project, cmd.userId));

    return project;
  }
}
```

### Handler with Authorization

```typescript
// modules/translation/handlers/update-translation.handler.ts
export class UpdateTranslationHandler implements ICommandHandler<UpdateTranslationCommand> {
  constructor(
    private translationRepo: TranslationRepository,
    private accessService: AccessService,
    private eventBus: EventBus
  ) {}

  async execute(cmd: UpdateTranslationCommand): Promise<Translation> {
    // 1. Verify access
    const key = await this.translationRepo.findKeyById(cmd.keyId);
    if (!key) {
      throw new NotFoundError('Key');
    }

    await this.accessService.verifyAccess(cmd.userId, key.projectId, 'translator');

    // 2. Update translation
    const translation = await this.translationRepo.upsertTranslation({
      keyId: cmd.keyId,
      language: cmd.language,
      value: cmd.value,
    });

    // 3. Emit event
    await this.eventBus.publish(new TranslationUpdatedEvent(translation, key.branchId, cmd.userId));

    return translation;
  }
}
```

### Bulk Command Handler

```typescript
// modules/translation/handlers/bulk-update.handler.ts
export class BulkUpdateTranslationsHandler implements ICommandHandler<BulkUpdateTranslationsCommand> {
  constructor(
    private translationRepo: TranslationRepository,
    private eventBus: EventBus
  ) {}

  async execute(cmd: BulkUpdateTranslationsCommand): Promise<Translation[]> {
    const results: Translation[] = [];

    // Process in transaction
    await this.translationRepo.transaction(async (tx) => {
      for (const update of cmd.updates) {
        const translation = await tx.upsertTranslation({
          keyId: update.keyId,
          language: update.language,
          value: update.value,
        });
        results.push(translation);
      }
    });

    // Emit batch event
    await this.eventBus.publish(
      new TranslationsBulkUpdatedEvent(results, cmd.branchId, cmd.userId)
    );

    return results;
  }
}
```

## Registration

### Container Registration

```typescript
// shared/container/index.ts
import { createContainer, asClass } from 'awilix';

export function createAppContainer() {
  const container = createContainer();

  // Register handlers
  container.register({
    createProjectHandler: asClass(CreateProjectHandler).scoped(),
    updateProjectHandler: asClass(UpdateProjectHandler).scoped(),
    deleteProjectHandler: asClass(DeleteProjectHandler).scoped(),
    updateTranslationHandler: asClass(UpdateTranslationHandler).scoped(),
    bulkUpdateHandler: asClass(BulkUpdateTranslationsHandler).scoped(),
  });

  // Register CommandBus
  container.register({
    commandBus: asFunction(({ container }) => {
      const bus = new CommandBus(container);

      // Register command -> handler mappings
      bus.register(CreateProjectCommand, 'createProjectHandler');
      bus.register(UpdateProjectCommand, 'updateProjectHandler');
      bus.register(DeleteProjectCommand, 'deleteProjectHandler');
      bus.register(UpdateTranslationCommand, 'updateTranslationHandler');
      bus.register(BulkUpdateTranslationsCommand, 'bulkUpdateHandler');

      return bus;
    }).singleton(),
  });

  return container;
}
```

## Usage in Routes

```typescript
// routes/projects/handlers.ts
export function createProjectHandlers(container: AwilixContainer) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      const project = await commandBus.execute<Project>(
        new CreateProjectCommand(
          request.body.name,
          request.body.slug,
          request.body.sourceLanguage,
          request.body.targetLanguages,
          request.userId
        )
      );

      reply.code(201);
      return toProjectDto(project);
    },
  };
}
```

## Error Handling

```typescript
// Domain errors thrown from handlers
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

// Fastify error handler converts to HTTP response
app.setErrorHandler((error, request, reply) => {
  if (error instanceof DomainError) {
    return reply.code(error.statusCode).send({
      error: error.message,
    });
  }
  // Handle other errors...
});
```

## Testing Commands

```typescript
describe('CreateProjectHandler', () => {
  let handler: CreateProjectHandler;
  let projectRepo: MockProxy<ProjectRepository>;
  let eventBus: MockProxy<EventBus>;

  beforeEach(() => {
    projectRepo = mock<ProjectRepository>();
    eventBus = mock<EventBus>();
    handler = new CreateProjectHandler(projectRepo, mock(), eventBus);
  });

  it('creates project and emits event', async () => {
    projectRepo.findBySlug.mockResolvedValue(null);
    projectRepo.create.mockResolvedValue(mockProject);
    projectRepo.createBranch.mockResolvedValue(mockBranch);

    const result = await handler.execute(
      new CreateProjectCommand('Test', 'test', 'en', ['de'], 'user1')
    );

    expect(result).toEqual(mockProject);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        project: mockProject,
        userId: 'user1',
      })
    );
  });

  it('throws on duplicate slug', async () => {
    projectRepo.findBySlug.mockResolvedValue(mockProject);

    await expect(
      handler.execute(new CreateProjectCommand('Test', 'test', 'en', [], 'user1'))
    ).rejects.toThrow(ConflictError);
  });
});
```

## Transaction Strategy

### When to Use Transactions

| Scenario                    | Transaction Needed? | Reason                   |
| --------------------------- | ------------------- | ------------------------ |
| Single entity create/update | No                  | Atomic by default        |
| Multiple related entities   | Yes                 | Ensure consistency       |
| Bulk operations             | Yes                 | All-or-nothing semantics |
| Entity + child records      | Yes                 | Referential integrity    |

### Transaction Patterns

#### 1. Simple Commands (No Transaction)

Most single-entity operations don't need explicit transactions:

```typescript
// Single update is atomic - no transaction needed
async execute(cmd: UpdateEnvironmentCommand): Promise<Environment> {
  const env = await this.repo.findById(cmd.id);
  if (!env) throw new NotFoundError('Environment');

  const updated = await this.repo.update(cmd.id, { name: cmd.name });
  await this.eventBus.publish(new EnvironmentUpdatedEvent(updated, cmd.userId));

  return updated;
}
```

#### 2. Multi-Step Commands (Use Transaction)

When creating related entities together:

```typescript
async execute(cmd: CreateProjectCommand): Promise<Project> {
  // Use transaction for multi-entity creation
  const project = await this.prisma.$transaction(async (tx) => {
    const proj = await tx.project.create({
      data: { name: cmd.name, slug: cmd.slug },
    });

    // Create default space
    await tx.space.create({
      data: { name: 'Default', projectId: proj.id },
    });

    // Add owner membership
    await tx.projectMember.create({
      data: { userId: cmd.userId, projectId: proj.id, role: 'OWNER' },
    });

    return proj;
  });

  // Events AFTER transaction commits
  await this.eventBus.publish(new ProjectCreatedEvent(project, cmd.userId));

  return project;
}
```

#### 3. Events and Transactions

**Critical Rule**: Always emit events AFTER the transaction commits.

```typescript
// ✅ CORRECT: Event after transaction
const result = await this.prisma.$transaction(async (tx) => {
  // ... database operations
  return entity;
});
await this.eventBus.publish(new EntityCreatedEvent(result));

// ❌ WRONG: Event inside transaction (may emit for rolled-back data)
await this.prisma.$transaction(async (tx) => {
  const entity = await tx.entity.create({ ... });
  await this.eventBus.publish(new EntityCreatedEvent(entity)); // BAD!
  return entity;
});
```

### Event Delivery Guarantees

Our current approach: **At-most-once delivery**

- Events are fire-and-forget after transaction commits
- If event publishing fails, the database change persists
- EventBus logs failures but doesn't retry

**Acceptable for:**

- Activity logging (eventual consistency acceptable)
- Real-time sync (clients can refresh)
- Webhooks (external systems handle retries)

**Future: Outbox Pattern (for critical events)**

If you need guaranteed delivery:

```typescript
// Inside transaction: write to outbox table
await this.prisma.$transaction(async (tx) => {
  const entity = await tx.entity.create({ ... });

  // Write event to outbox (same transaction)
  await tx.eventOutbox.create({
    data: {
      eventType: 'EntityCreated',
      payload: JSON.stringify({ entity, userId }),
      status: 'pending',
    },
  });

  return entity;
});

// Background worker processes outbox entries
```

### Repository Transaction Support

Repositories should accept optional transaction context:

```typescript
// environment.repository.ts
async create(
  data: CreateEnvironmentData,
  tx?: PrismaTransaction
): Promise<Environment> {
  const client = tx ?? this.prisma;
  return client.environment.create({ data });
}
```

### Summary

| Pattern        | Use When                  | Event Timing      |
| -------------- | ------------------------- | ----------------- |
| No transaction | Single entity operations  | After operation   |
| $transaction   | Multiple related entities | After transaction |
| Outbox pattern | Critical event delivery   | Background worker |

## Best Practices

1. **One command, one handler** - Single responsibility
2. **Validate in handler** - Not in command constructor
3. **Always emit events** - Enable side effects
4. **Include userId** - For authorization and audit
5. **Keep commands flat** - No nested objects when possible
6. **Use transactions** - For multi-step operations
7. **Return the result** - Caller needs the created/updated entity
8. **Events after commits** - Never emit inside transactions
