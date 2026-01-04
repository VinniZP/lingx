# Queries

Queries represent requests for data. They never modify state and can be cached.

## Query Structure

### Naming Convention

Queries use verb + noun describing what data is returned:

| Domain        | Queries                                          |
| ------------- | ------------------------------------------------ |
| Project       | `GetProject`, `ListProjects`, `GetProjectStats`  |
| Translation   | `GetTranslations`, `SearchKeys`, `GetKeyDetails` |
| Branch        | `GetBranch`, `ListBranches`, `CompareBranches`   |
| Activity      | `GetActivityFeed`, `GetUserActivity`             |
| Collaboration | `GetPresence`, `GetActiveUsers`                  |

### Query Class

```typescript
// modules/project/queries/get-project.query.ts
export class GetProjectQuery {
  constructor(
    public readonly projectId: string,
    public readonly userId: string
  ) {}
}

// With options
export class ListProjectsQuery {
  constructor(
    public readonly userId: string,
    public readonly options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: 'name' | 'createdAt' | 'updatedAt';
    } = {}
  ) {}
}
```

## QueryBus Implementation

```typescript
// shared/cqrs/query-bus.ts
import { AwilixContainer } from 'awilix';

type Constructor<T> = new (...args: any[]) => T;

export interface IQueryHandler<T> {
  execute(query: T): Promise<unknown>;
}

export class QueryBus {
  private handlers = new Map<string, string>();

  constructor(private container: AwilixContainer) {}

  register<T>(queryType: Constructor<T>, handlerName: string): void {
    this.handlers.set(queryType.name, handlerName);
  }

  async execute<TResult>(query: object): Promise<TResult> {
    const handlerName = this.handlers.get(query.constructor.name);

    if (!handlerName) {
      throw new Error(`No handler for ${query.constructor.name}`);
    }

    const handler = this.container.resolve<IQueryHandler<typeof query>>(handlerName);

    return handler.execute(query) as Promise<TResult>;
  }
}
```

## Query Handler Patterns

### Basic Handler

```typescript
// modules/project/handlers/get-project.handler.ts
export class GetProjectHandler implements IQueryHandler<GetProjectQuery> {
  constructor(
    private projectRepo: ProjectRepository,
    private accessService: AccessService
  ) {}

  async execute(query: GetProjectQuery): Promise<Project> {
    // 1. Fetch data
    const project = await this.projectRepo.findById(query.projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // 2. Verify access
    await this.accessService.verifyAccess(query.userId, query.projectId, 'viewer');

    return project;
  }
}
```

### List Handler with Pagination

```typescript
// modules/project/handlers/list-projects.handler.ts
export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery> {
  constructor(private projectRepo: ProjectRepository) {}

  async execute(query: ListProjectsQuery): Promise<PaginatedResult<Project>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt' } = query.options;

    const [items, total] = await this.projectRepo.findByUser(query.userId, {
      skip: (page - 1) * limit,
      take: limit,
      search,
      orderBy: { [sortBy]: 'desc' },
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

### Complex Query Handler

```typescript
// modules/translation/handlers/get-translations.handler.ts
export class GetTranslationsHandler implements IQueryHandler<GetTranslationsQuery> {
  constructor(
    private translationRepo: TranslationRepository,
    private accessService: AccessService
  ) {}

  async execute(query: GetTranslationsQuery): Promise<TranslationMatrix> {
    const { branchId, options } = query;

    // Verify access
    const branch = await this.translationRepo.findBranchById(branchId);
    if (!branch) {
      throw new NotFoundError('Branch');
    }

    await this.accessService.verifyAccess(query.userId, branch.projectId, 'viewer');

    // Fetch keys with translations
    const [keys, total] = await this.translationRepo.findKeysByBranch(branchId, {
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      search: options.search,
      filter: options.filter, // 'all' | 'missing' | 'translated'
      namespace: options.namespace,
    });

    // Get project languages
    const languages = await this.translationRepo.getProjectLanguages(branch.projectId);

    return {
      keys,
      languages,
      total,
      page: options.page,
      limit: options.limit,
    };
  }
}
```

### Aggregation Query

```typescript
// modules/project/handlers/get-project-stats.handler.ts
export class GetProjectStatsHandler implements IQueryHandler<GetProjectStatsQuery> {
  constructor(private statsRepo: StatsRepository) {}

  async execute(query: GetProjectStatsQuery): Promise<ProjectStats> {
    const [keyCount, translationCounts, languageStats] = await Promise.all([
      this.statsRepo.countKeys(query.projectId),
      this.statsRepo.countTranslations(query.projectId),
      this.statsRepo.getLanguageStats(query.projectId),
    ]);

    const totalTranslations = keyCount * languageStats.length;
    const completedTranslations = translationCounts.completed;

    return {
      totalKeys: keyCount,
      totalLanguages: languageStats.length,
      completionRate: totalTranslations > 0 ? completedTranslations / totalTranslations : 0,
      languageStats,
    };
  }
}
```

## Caching Strategies

### Simple Cache

```typescript
// With Redis cache
export class GetProjectHandler implements IQueryHandler<GetProjectQuery> {
  constructor(
    private projectRepo: ProjectRepository,
    private cache: CacheService
  ) {}

  async execute(query: GetProjectQuery): Promise<Project> {
    const cacheKey = `project:${query.projectId}`;

    // Check cache
    const cached = await this.cache.get<Project>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const project = await this.projectRepo.findById(query.projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Cache for 5 minutes
    await this.cache.set(cacheKey, project, 300);

    return project;
  }
}
```

### Cache Invalidation via Events

```typescript
// Event handler invalidates cache
@EventHandler(ProjectUpdatedEvent)
export class ProjectCacheInvalidator implements IEventHandler<ProjectUpdatedEvent> {
  constructor(private cache: CacheService) {}

  async handle(event: ProjectUpdatedEvent): Promise<void> {
    await this.cache.delete(`project:${event.project.id}`);
  }
}
```

## Registration

```typescript
// shared/container/index.ts
export function createAppContainer() {
  const container = createContainer();

  // Register query handlers
  container.register({
    getProjectHandler: asClass(GetProjectHandler).scoped(),
    listProjectsHandler: asClass(ListProjectsHandler).scoped(),
    getProjectStatsHandler: asClass(GetProjectStatsHandler).scoped(),
    getTranslationsHandler: asClass(GetTranslationsHandler).scoped(),
    searchKeysHandler: asClass(SearchKeysHandler).scoped(),
  });

  // Register QueryBus
  container.register({
    queryBus: asFunction(({ container }) => {
      const bus = new QueryBus(container);

      bus.register(GetProjectQuery, 'getProjectHandler');
      bus.register(ListProjectsQuery, 'listProjectsHandler');
      bus.register(GetProjectStatsQuery, 'getProjectStatsHandler');
      bus.register(GetTranslationsQuery, 'getTranslationsHandler');
      bus.register(SearchKeysQuery, 'searchKeysHandler');

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
    async get(request: FastifyRequest, reply: FastifyReply) {
      const queryBus = container.resolve<QueryBus>('queryBus');

      const project = await queryBus.execute<Project>(
        new GetProjectQuery(request.params.id, request.userId)
      );

      return toProjectDto(project);
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const queryBus = container.resolve<QueryBus>('queryBus');

      const result = await queryBus.execute<PaginatedResult<Project>>(
        new ListProjectsQuery(request.userId, {
          page: request.query.page,
          limit: request.query.limit,
          search: request.query.search,
        })
      );

      return {
        items: result.items.map(toProjectDto),
        ...result,
      };
    },
  };
}
```

## Testing Queries

```typescript
describe('GetTranslationsHandler', () => {
  let handler: GetTranslationsHandler;
  let translationRepo: MockProxy<TranslationRepository>;

  beforeEach(() => {
    translationRepo = mock<TranslationRepository>();
    handler = new GetTranslationsHandler(translationRepo, mock());
  });

  it('returns paginated translations', async () => {
    translationRepo.findBranchById.mockResolvedValue(mockBranch);
    translationRepo.findKeysByBranch.mockResolvedValue([mockKeys, 100]);
    translationRepo.getProjectLanguages.mockResolvedValue(mockLanguages);

    const result = await handler.execute(
      new GetTranslationsQuery('branch1', 'user1', { page: 1, limit: 20 })
    );

    expect(result.keys).toEqual(mockKeys);
    expect(result.total).toBe(100);
    expect(result.languages).toEqual(mockLanguages);
  });

  it('throws NotFoundError for invalid branch', async () => {
    translationRepo.findBranchById.mockResolvedValue(null);

    await expect(handler.execute(new GetTranslationsQuery('invalid', 'user1', {}))).rejects.toThrow(
      NotFoundError
    );
  });
});
```

## Best Practices

1. **Never modify state** - Queries are pure reads
2. **Include userId** - For access control
3. **Use pagination** - For list queries
4. **Consider caching** - Especially for aggregations
5. **Parallel fetching** - Use `Promise.all` for independent data
6. **Return typed results** - Define result types explicitly
7. **Verify access** - Even for read operations
