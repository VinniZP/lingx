# Modules

Modules organize code by business domain, grouping related commands, queries, events, and handlers.

## Module Structure

```
apps/api/src/modules/
├── project/
│   ├── commands/
│   │   ├── create-project.command.ts
│   │   ├── update-project.command.ts
│   │   └── delete-project.command.ts
│   ├── queries/
│   │   ├── get-project.query.ts
│   │   ├── list-projects.query.ts
│   │   └── get-project-stats.query.ts
│   ├── events/
│   │   ├── project-created.event.ts
│   │   ├── project-updated.event.ts
│   │   └── project-deleted.event.ts
│   ├── handlers/
│   │   ├── commands/
│   │   │   ├── create-project.handler.ts
│   │   │   ├── update-project.handler.ts
│   │   │   └── delete-project.handler.ts
│   │   ├── queries/
│   │   │   ├── get-project.handler.ts
│   │   │   ├── list-projects.handler.ts
│   │   │   └── get-project-stats.handler.ts
│   │   └── events/
│   │       └── project-audit.handler.ts
│   ├── project.repository.ts
│   └── index.ts                    # Module exports
├── translation/
├── collaboration/
└── ai/
```

## Lingx Domain Modules

### Project Module

Manages projects, languages, and members.

```typescript
// modules/project/index.ts
export * from './commands/create-project.command';
export * from './commands/update-project.command';
export * from './commands/delete-project.command';

export * from './queries/get-project.query';
export * from './queries/list-projects.query';
export * from './queries/get-project-stats.query';

export * from './events/project-created.event';
export * from './events/project-updated.event';

export * from './handlers/commands/create-project.handler';
export * from './handlers/queries/get-project.handler';

export * from './project.repository';
```

**Responsibilities:**

- Project CRUD operations
- Language management (add/remove languages)
- Member management (invite, roles)
- Project settings

### Translation Module

Manages keys, translations, and namespaces.

```
modules/translation/
├── commands/
│   ├── create-key.command.ts
│   ├── update-translation.command.ts
│   ├── bulk-update.command.ts
│   ├── delete-key.command.ts
│   └── import-translations.command.ts
├── queries/
│   ├── get-translations.query.ts
│   ├── search-keys.query.ts
│   ├── get-key-details.query.ts
│   └── export-translations.query.ts
├── events/
│   ├── key-created.event.ts
│   ├── translation-updated.event.ts
│   └── translations-imported.event.ts
├── handlers/
└── translation.repository.ts
```

**Responsibilities:**

- Key management (CRUD, namespaces)
- Translation editing (single, bulk)
- Import/export (JSON, YAML, XLIFF)
- Search and filtering

### Branch Module

Manages translation branches for version control.

```
modules/branch/
├── commands/
│   ├── create-branch.command.ts
│   ├── merge-branch.command.ts
│   └── delete-branch.command.ts
├── queries/
│   ├── get-branch.query.ts
│   ├── list-branches.query.ts
│   └── compare-branches.query.ts
├── events/
│   ├── branch-created.event.ts
│   └── branch-merged.event.ts
└── branch.repository.ts
```

**Responsibilities:**

- Branch CRUD
- Branch comparison (diff)
- Merge operations
- Conflict detection

### Collaboration Module

Manages real-time presence and editing.

```
modules/collaboration/
├── commands/
│   ├── join-room.command.ts
│   ├── leave-room.command.ts
│   ├── focus-key.command.ts
│   └── blur-key.command.ts
├── queries/
│   ├── get-presence.query.ts
│   └── get-active-users.query.ts
├── events/
│   ├── user-joined-room.event.ts
│   ├── user-left-room.event.ts
│   ├── user-focused-key.event.ts
│   └── user-blurred-key.event.ts
├── handlers/
│   └── events/
│       ├── presence-broadcast.handler.ts
│       └── presence-cleanup.handler.ts
└── presence.repository.ts
```

**Responsibilities:**

- Real-time presence tracking
- User focus state
- WebSocket room management
- Presence cleanup (stale connections)

### AI Module

Manages AI-powered translation features.

```
modules/ai/
├── commands/
│   ├── request-ai-translation.command.ts
│   ├── suggest-key-name.command.ts
│   └── estimate-quality.command.ts
├── queries/
│   ├── get-ai-status.query.ts
│   └── get-quality-scores.query.ts
├── events/
│   ├── ai-translation-requested.event.ts
│   ├── ai-translation-completed.event.ts
│   └── ai-translation-failed.event.ts
├── handlers/
│   └── events/
│       ├── ai-job-queue.handler.ts
│       └── ai-result-notify.handler.ts
└── ai.repository.ts
```

**Responsibilities:**

- AI translation requests
- Quality estimation
- Key name suggestions
- Context-aware translations

## Module Registration

### Commands and Queries

```typescript
// shared/container/modules/project.module.ts
import { asClass, AwilixContainer } from 'awilix';

export function registerProjectModule(container: AwilixContainer) {
  container.register({
    // Repositories
    projectRepository: asClass(ProjectRepository).scoped(),

    // Command handlers
    createProjectHandler: asClass(CreateProjectHandler).scoped(),
    updateProjectHandler: asClass(UpdateProjectHandler).scoped(),
    deleteProjectHandler: asClass(DeleteProjectHandler).scoped(),

    // Query handlers
    getProjectHandler: asClass(GetProjectHandler).scoped(),
    listProjectsHandler: asClass(ListProjectsHandler).scoped(),
    getProjectStatsHandler: asClass(GetProjectStatsHandler).scoped(),

    // Event handlers
    projectAuditHandler: asClass(ProjectAuditHandler).scoped(),
  });
}

export function registerProjectCommands(commandBus: CommandBus) {
  commandBus.register(CreateProjectCommand, 'createProjectHandler');
  commandBus.register(UpdateProjectCommand, 'updateProjectHandler');
  commandBus.register(DeleteProjectCommand, 'deleteProjectHandler');
}

export function registerProjectQueries(queryBus: QueryBus) {
  queryBus.register(GetProjectQuery, 'getProjectHandler');
  queryBus.register(ListProjectsQuery, 'listProjectsHandler');
  queryBus.register(GetProjectStatsQuery, 'getProjectStatsHandler');
}

export function registerProjectEvents(eventBus: EventBus) {
  eventBus.subscribe(ProjectCreatedEvent, 'projectAuditHandler');
  eventBus.subscribe(ProjectUpdatedEvent, 'projectAuditHandler');
  eventBus.subscribe(ProjectDeletedEvent, 'projectAuditHandler');
}
```

### Main Container

```typescript
// shared/container/index.ts
import { createContainer, asFunction, asValue } from 'awilix';
import { registerProjectModule, registerProjectCommands } from './modules/project.module';
import { registerTranslationModule } from './modules/translation.module';
import { registerCollaborationModule } from './modules/collaboration.module';

export function createAppContainer() {
  const container = createContainer();

  // Infrastructure
  container.register({
    prisma: asValue(new PrismaClient()),
    redis: asValue(new Redis(process.env.REDIS_URL)),
  });

  // Register all modules
  registerProjectModule(container);
  registerTranslationModule(container);
  registerCollaborationModule(container);

  // Create buses
  const commandBus = new CommandBus(container);
  const queryBus = new QueryBus(container);
  const eventBus = new EventBus(container);

  // Register commands/queries/events for all modules
  registerProjectCommands(commandBus);
  registerTranslationCommands(commandBus);
  registerCollaborationCommands(commandBus);

  registerProjectQueries(queryBus);
  registerTranslationQueries(queryBus);
  registerCollaborationQueries(queryBus);

  registerProjectEvents(eventBus);
  registerTranslationEvents(eventBus);
  registerCollaborationEvents(eventBus);

  container.register({
    commandBus: asValue(commandBus),
    queryBus: asValue(queryBus),
    eventBus: asValue(eventBus),
  });

  return container;
}
```

## Cross-Module Communication

Modules communicate via events, not direct dependencies.

### Wrong: Direct Dependency

```typescript
// BAD - Translation module depends on AI module
export class UpdateTranslationHandler {
  constructor(
    private translationRepo: TranslationRepository,
    private aiService: AIService // ❌ Cross-module dependency
  ) {}

  async execute(cmd: UpdateTranslationCommand) {
    const translation = await this.translationRepo.update(cmd);
    await this.aiService.estimateQuality(translation); // ❌ Direct call
    return translation;
  }
}
```

### Correct: Event-Based Communication

```typescript
// GOOD - Translation module emits event, AI module reacts
export class UpdateTranslationHandler {
  constructor(
    private translationRepo: TranslationRepository,
    private eventBus: EventBus
  ) {}

  async execute(cmd: UpdateTranslationCommand) {
    const translation = await this.translationRepo.update(cmd);
    await this.eventBus.publish(
      new TranslationUpdatedEvent(translation) // ✅ Event
    );
    return translation;
  }
}

// AI module subscribes to translation events
@EventHandler(TranslationUpdatedEvent)
export class QualityEstimationHandler {
  async handle(event: TranslationUpdatedEvent) {
    // ✅ AI module reacts independently
    await this.queue.add('ai:estimate-quality', event.translation);
  }
}
```

## File Naming Conventions

| Type       | Pattern                                 | Example                     |
| ---------- | --------------------------------------- | --------------------------- |
| Command    | `{verb}-{noun}.command.ts`              | `create-project.command.ts` |
| Query      | `{verb}-{noun}.query.ts`                | `get-project.query.ts`      |
| Event      | `{noun}-{past-verb}.event.ts`           | `project-created.event.ts`  |
| Handler    | `{command/query/event-name}.handler.ts` | `create-project.handler.ts` |
| Repository | `{module}.repository.ts`                | `project.repository.ts`     |

## Module Boundaries

Each module should:

1. **Own its data** - Repository accesses only its tables
2. **Export public API** - Commands, queries, events via index.ts
3. **Hide implementation** - Handlers are internal
4. **Communicate via events** - No direct cross-module calls

```
✅ Module A emits event → Module B reacts
❌ Module A imports handler from Module B
❌ Module A calls Module B's repository
```

## Adding a New Module

1. Create directory structure:

   ```bash
   mkdir -p modules/new-module/{commands,queries,events,handlers/{commands,queries,events}}
   ```

2. Create repository: `new-module.repository.ts`

3. Define commands, queries, events

4. Create handlers

5. Create module registration: `container/modules/new-module.module.ts`

6. Register in main container

7. Create routes if needed
