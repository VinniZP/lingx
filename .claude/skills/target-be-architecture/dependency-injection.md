# Dependency Injection

Awilix provides dependency injection for loose coupling and testability.

## Container Setup

### Main Container

```typescript
// shared/container/index.ts
import { createContainer, asClass, asFunction, asValue, Lifetime } from 'awilix';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { CommandBus, QueryBus, EventBus } from '@/shared/cqrs';

// Module registrations
import { registerProjectModule, registerProjectBuses } from './modules/project.module';
import { registerTranslationModule, registerTranslationBuses } from './modules/translation.module';
import {
  registerCollaborationModule,
  registerCollaborationBuses,
} from './modules/collaboration.module';

export interface Cradle {
  // Infrastructure
  prisma: PrismaClient;
  redis: Redis;

  // Buses
  commandBus: CommandBus;
  queryBus: QueryBus;
  eventBus: EventBus;

  // Repositories
  projectRepository: ProjectRepository;
  translationRepository: TranslationRepository;
  presenceRepository: PresenceRepository;

  // Services
  accessService: AccessService;

  // Handlers
  createProjectHandler: CreateProjectHandler;
  getProjectHandler: GetProjectHandler;
  // ... more handlers
}

export function createAppContainer() {
  const container = createContainer<Cradle>();

  // Infrastructure (singleton)
  container.register({
    prisma: asValue(new PrismaClient()),
    redis: asValue(new Redis(process.env.REDIS_URL)),
  });

  // Shared services
  container.register({
    accessService: asClass(AccessService).scoped(),
  });

  // Register domain modules
  registerProjectModule(container);
  registerTranslationModule(container);
  registerCollaborationModule(container);

  // Create and configure buses
  const commandBus = new CommandBus(container);
  const queryBus = new QueryBus(container);
  const eventBus = new EventBus(container);

  registerProjectBuses(commandBus, queryBus, eventBus);
  registerTranslationBuses(commandBus, queryBus, eventBus);
  registerCollaborationBuses(commandBus, queryBus, eventBus);

  container.register({
    commandBus: asValue(commandBus),
    queryBus: asValue(queryBus),
    eventBus: asValue(eventBus),
  });

  return container;
}
```

## Module Registration Pattern

```typescript
// shared/container/modules/project.module.ts
import { AwilixContainer, asClass } from 'awilix';
import { CommandBus, QueryBus, EventBus } from '@/shared/cqrs';

// Commands, Queries, Events
import { CreateProjectCommand, UpdateProjectCommand } from '@/modules/project/commands';
import { GetProjectQuery, ListProjectsQuery } from '@/modules/project/queries';
import { ProjectCreatedEvent, ProjectUpdatedEvent } from '@/modules/project/events';

// Handlers
import { CreateProjectHandler, UpdateProjectHandler } from '@/modules/project/handlers/commands';
import { GetProjectHandler, ListProjectsHandler } from '@/modules/project/handlers/queries';
import { ProjectAuditHandler } from '@/modules/project/handlers/events';

// Repository
import { ProjectRepository } from '@/modules/project/project.repository';

export function registerProjectModule(container: AwilixContainer) {
  container.register({
    // Repository
    projectRepository: asClass(ProjectRepository).scoped(),

    // Command handlers
    createProjectHandler: asClass(CreateProjectHandler).scoped(),
    updateProjectHandler: asClass(UpdateProjectHandler).scoped(),

    // Query handlers
    getProjectHandler: asClass(GetProjectHandler).scoped(),
    listProjectsHandler: asClass(ListProjectsHandler).scoped(),

    // Event handlers
    projectAuditHandler: asClass(ProjectAuditHandler).scoped(),
  });
}

export function registerProjectBuses(
  commandBus: CommandBus,
  queryBus: QueryBus,
  eventBus: EventBus
) {
  // Commands → Handlers
  commandBus.register(CreateProjectCommand, 'createProjectHandler');
  commandBus.register(UpdateProjectCommand, 'updateProjectHandler');

  // Queries → Handlers
  queryBus.register(GetProjectQuery, 'getProjectHandler');
  queryBus.register(ListProjectsQuery, 'listProjectsHandler');

  // Events → Handlers (multiple handlers per event)
  eventBus.subscribe(ProjectCreatedEvent, 'projectAuditHandler');
  eventBus.subscribe(ProjectUpdatedEvent, 'projectAuditHandler');
}
```

## Lifetime Scopes

### Singleton (one instance)

```typescript
// Infrastructure shared across all requests
container.register({
  prisma: asValue(new PrismaClient()),
  redis: asValue(new Redis()),
  commandBus: asValue(commandBus),
  queryBus: asValue(queryBus),
  eventBus: asValue(eventBus),
});
```

### Scoped (per request)

```typescript
// Handlers and repositories - new instance per request
container.register({
  projectRepository: asClass(ProjectRepository).scoped(),
  createProjectHandler: asClass(CreateProjectHandler).scoped(),
});
```

### Transient (new instance each time)

```typescript
// Rarely needed
container.register({
  tempService: asClass(TempService).transient(),
});
```

## Fastify Integration

```typescript
// plugins/di.ts
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix';
import { createAppContainer } from '@/shared/container';

export default fp(async function diPlugin(app: FastifyInstance) {
  const container = createAppContainer();

  app.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true,
  });

  diContainer.register(container.registrations);

  // Make container available to routes
  app.decorate('container', container);
});

// Type extension
declare module 'fastify' {
  interface FastifyInstance {
    container: AwilixContainer<Cradle>;
  }
  interface FastifyRequest {
    diScope: AwilixContainer<Cradle>;
  }
}
```

## Constructor Injection

Handlers receive dependencies via constructor (Awilix matches param names to registrations):

```typescript
// modules/project/handlers/commands/create-project.handler.ts
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
  constructor(
    private projectRepository: ProjectRepository,
    private accessService: AccessService,
    private eventBus: EventBus
  ) {}

  async execute(command: CreateProjectCommand): Promise<Project> {
    const project = await this.projectRepository.create({
      name: command.name,
      slug: command.slug,
      ownerId: command.userId,
    });

    await this.accessService.grantAccess(command.userId, project.id, 'owner');

    await this.eventBus.publish(new ProjectCreatedEvent(project, command.userId));

    return project;
  }
}
```

## Resolving in Routes

```typescript
// Get buses from container in route handlers
export function createProjectHandlers(container: AwilixContainer) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      const project = await commandBus.execute(new CreateProjectCommand(/* ... */));

      return toProjectDto(project);
    },
  };
}
```

## Testing with DI

### Mock Dependencies

```typescript
import { mock, MockProxy } from 'vitest-mock-extended';

describe('CreateProjectHandler', () => {
  let handler: CreateProjectHandler;
  let projectRepo: MockProxy<ProjectRepository>;
  let accessService: MockProxy<AccessService>;
  let eventBus: MockProxy<EventBus>;

  beforeEach(() => {
    projectRepo = mock<ProjectRepository>();
    accessService = mock<AccessService>();
    eventBus = mock<EventBus>();

    handler = new CreateProjectHandler(projectRepo, accessService, eventBus);
  });

  it('creates project and emits event', async () => {
    projectRepo.create.mockResolvedValue(mockProject);

    const result = await handler.execute(
      new CreateProjectCommand('Test', 'test', 'en', [], 'user1')
    );

    expect(projectRepo.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(ProjectCreatedEvent));
  });
});
```

### Test Container

```typescript
// tests/helpers/test-container.ts
export function createTestContainer(overrides: Partial<Cradle> = {}) {
  const container = createContainer<Cradle>();

  container.register({
    prisma: asValue(mock<PrismaClient>()),
    redis: asValue(mock<Redis>()),
    commandBus: asValue(mock<CommandBus>()),
    queryBus: asValue(mock<QueryBus>()),
    eventBus: asValue(mock<EventBus>()),
  });

  for (const [name, value] of Object.entries(overrides)) {
    container.register({ [name]: asValue(value) });
  }

  return container;
}
```

## Resolving in Workers

```typescript
// Workers need their own scope
export function createWorker(container: AwilixContainer) {
  return async (job: Job) => {
    const scope = container.createScope();
    try {
      const handler = scope.resolve<AITranslationHandler>('aiTranslationHandler');
      await handler.handle(job.data);
    } finally {
      scope.dispose();
    }
  };
}
```

## Best Practices

### DO

- Use scoped lifetime for request-bound services
- Singleton for infrastructure (Prisma, Redis, buses)
- Type the container with Cradle interface
- Match constructor params to registration names
- Organize registrations by module

### DON'T

- Resolve from container in constructors
- Use container as Service Locator
- Create circular dependencies
- Register everything as singleton
- Forget to dispose scopes in workers

Sources:

- [@fastify/awilix](https://github.com/fastify/fastify-awilix)
- [Awilix Documentation](https://github.com/jeffijoe/awilix)
