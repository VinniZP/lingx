# Migration Guide: Services to CQRS-lite

Step-by-step guide for converting existing service-based code to the CQRS-lite pattern.

## Overview

| Before (Service)            | After (CQRS-lite)                               |
| --------------------------- | ----------------------------------------------- |
| `ProjectService.create()`   | `CreateProjectCommand` → `CreateProjectHandler` |
| `ProjectService.findById()` | `GetProjectQuery` → `GetProjectHandler`         |
| Business logic in service   | Logic in handlers                               |
| No events                   | Events for side effects                         |

## Migration Steps

### 1. Identify Operations

Review the existing service and categorize methods:

```typescript
// Example: EnvironmentService
class EnvironmentService {
  // WRITE operations → Commands
  async create(data) { ... }
  async update(id, data) { ... }
  async delete(id) { ... }
  async switchBranch(id, branchId) { ... }

  // READ operations → Queries
  async findById(id) { ... }
  async findByProjectId(projectId) { ... }
}
```

### 2. Create Module Structure

```bash
mkdir -p src/modules/environment/{commands,queries,events,handlers}
touch src/modules/environment/environment.repository.ts
touch src/modules/environment/index.ts
```

### 3. Extract Repository

Move data access logic to a repository:

```typescript
// environment.repository.ts
export class EnvironmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Environment | null> {
    return this.prisma.environment.findUnique({ where: { id } });
  }

  async create(data: CreateEnvironmentData): Promise<Environment> {
    return this.prisma.environment.create({ data });
  }

  // ... other data access methods
}
```

### 4. Create Commands

For each write operation, create a command class:

```typescript
// commands/create-environment.command.ts
import type { ICommand } from '../../../shared/cqrs/index.js';

export type CreateEnvironmentResult = EnvironmentWithBranch;

export class CreateEnvironmentCommand implements ICommand {
  readonly __brand = 'command' as const;

  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly projectId: string,
    public readonly branchId: string,
    public readonly userId: string // Always include for auth/audit
  ) {}
}
```

### 5. Create Command Handlers

Move business logic from service to handler:

```typescript
// commands/create-environment.handler.ts
export class CreateEnvironmentHandler implements ICommandHandler<
  CreateEnvironmentCommand,
  CreateEnvironmentResult
> {
  constructor(
    private readonly repository: EnvironmentRepository,
    private readonly eventBus: IEventBus,
    private readonly accessService: AccessService
  ) {}

  async execute(command: CreateEnvironmentCommand): Promise<CreateEnvironmentResult> {
    const { name, slug, projectId, branchId, userId } = command;

    // 1. Authorization (moved from route)
    await this.accessService.verifyProjectAccess(userId, projectId, ['MANAGER', 'OWNER']);

    // 2. Validation
    const existing = await this.repository.findByProjectAndSlug(projectId, slug);
    if (existing) {
      throw new FieldValidationError([{ field: 'slug', message: 'Already exists' }]);
    }

    // 3. Execute
    const environment = await this.repository.create({ name, slug, projectId, branchId });

    // 4. Publish event (NEW - enables side effects)
    await this.eventBus.publish(new EnvironmentCreatedEvent(environment, userId));

    return environment;
  }
}
```

### 6. Create Queries

For each read operation:

```typescript
// queries/get-environment.query.ts
export type GetEnvironmentResult = EnvironmentWithBranch;

export class GetEnvironmentQuery implements IQuery {
  readonly __brand = 'query' as const;

  constructor(
    public readonly id: string,
    public readonly userId: string // For authorization
  ) {}
}
```

### 7. Create Query Handlers

```typescript
// queries/get-environment.handler.ts
export class GetEnvironmentHandler implements IQueryHandler<
  GetEnvironmentQuery,
  GetEnvironmentResult
> {
  constructor(
    private readonly repository: EnvironmentRepository,
    private readonly accessService: AccessService
  ) {}

  async execute(query: GetEnvironmentQuery): Promise<GetEnvironmentResult> {
    const environment = await this.repository.findById(query.id);
    if (!environment) {
      throw new NotFoundError('Environment');
    }

    // Authorization - return 404 to hide existence from unauthorized users
    try {
      await this.accessService.verifyProjectAccess(query.userId, environment.projectId);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'FORBIDDEN') {
        throw new NotFoundError('Environment');
      }
      throw error;
    }

    return environment;
  }
}
```

### 8. Create Events

Define events for side effects:

```typescript
// events/environment-created.event.ts
export class EnvironmentCreatedEvent implements IEvent {
  public readonly occurredAt = new Date();

  constructor(
    public readonly environment: EnvironmentWithBranch,
    public readonly userId: string
  ) {}
}
```

### 9. Create Event Handlers (Optional)

For activity logging, real-time sync, etc:

```typescript
// handlers/environment-activity.handler.ts
export class EnvironmentCreatedActivityHandler implements IEventHandler<EnvironmentCreatedEvent> {
  constructor(private readonly activityService: ActivityService) {}

  async handle(event: EnvironmentCreatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'environment_create',
      projectId: event.environment.projectId,
      userId: event.userId,
      // ...
    });
  }
}
```

### 10. Register Module

```typescript
// index.ts
export function registerEnvironmentModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    environmentRepository: asClass(EnvironmentRepository).singleton(),
  });

  // Register handlers
  container.register({
    createEnvironmentHandler: asClass(CreateEnvironmentHandler).singleton(),
    getEnvironmentHandler: asClass(GetEnvironmentHandler).singleton(),
    // ...
  });

  // Register with buses
  const commandBus = container.resolve<CommandBus>('commandBus');
  const queryBus = container.resolve<QueryBus>('queryBus');
  const eventBus = container.resolve<EventBus>('eventBus');

  commandBus.register(CreateEnvironmentCommand, 'createEnvironmentHandler');
  queryBus.register(GetEnvironmentQuery, 'getEnvironmentHandler');
  eventBus.register(EnvironmentCreatedEvent, 'environmentCreatedActivityHandler');
}
```

### 11. Update Routes

Simplify routes to be thin dispatchers:

```typescript
// Before (thick route with business logic)
app.post('/environments', async (request) => {
  const projectService = new ProjectService(prisma);
  const project = await projectService.findById(request.body.projectId);
  if (!project) throw new NotFoundError('Project');

  // Authorization logic here
  // Validation logic here
  // Business logic here

  return result;
});

// After (thin route)
app.post('/environments', async (request) => {
  const environment = await fastify.commandBus.execute<EnvironmentWithBranch>(
    new CreateEnvironmentCommand(
      request.body.name,
      request.body.slug,
      request.body.projectId,
      request.body.branchId,
      request.user.userId
    )
  );
  return toEnvironmentDto(environment);
});
```

### 12. Add to CQRS Plugin

```typescript
// plugins/cqrs.ts
import { registerEnvironmentModule } from '../modules/environment/index.js';

const domainModules: ModuleRegistrar[] = [
  registerHealthModule,
  registerEnvironmentModule, // Add new module here
];
```

## Coexistence Strategy

Old services and new CQRS modules can coexist:

```typescript
// Route can use both patterns during migration
app.get('/projects/:id', async (request) => {
  // Old service (to be migrated)
  const stats = await projectService.getStats(request.params.id);

  // New CQRS pattern
  const project = await fastify.queryBus.execute<Project>(
    new GetProjectQuery(request.params.id, request.user.userId)
  );

  return { ...project, stats };
});
```

## Migration Priority

Suggested order for migrating domains:

1. **Environment** (done) - Simple CRUD, good learning example
2. **Project** - Core entity, many dependents
3. **Translation** - High traffic, benefits from events
4. **Branch** - Complex operations (merge, diff)
5. **Import/Export** - Heavy background processing

## Checklist

- [ ] Create module directory structure
- [ ] Extract repository from service
- [ ] Create commands for write operations
- [ ] Create queries for read operations
- [ ] Create command handlers with authorization
- [ ] Create query handlers with authorization
- [ ] Create events for side effects
- [ ] Create event handlers (activity, real-time, etc.)
- [ ] Register module in container
- [ ] Update routes to use buses
- [ ] Add module to CQRS plugin
- [ ] Write tests for handlers
- [ ] Remove old service (after full migration)
