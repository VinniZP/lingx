# Service Layer

Services contain all business logic, orchestrating repositories and enforcing rules.

## Service Responsibilities

1. **Orchestrate Use Cases** - Coordinate multiple repository calls
2. **Enforce Business Rules** - Validate invariants, check permissions
3. **Handle Transactions** - Manage atomic operations
4. **Emit Events** - Trigger side effects (queues, notifications)

## Service Structure

```typescript
// services/project.service.ts
export class ProjectService {
  constructor(
    private projectRepo: ProjectRepository,
    private memberRepo: MemberRepository,
    private accessService: AccessService,
    private eventEmitter: EventEmitter
  ) {}

  // Query methods - include authorization
  async getById(userId: string, projectId: string): Promise<ProjectWithDetails> {
    // 1. Fetch data via repository
    const project = await this.projectRepo.findByIdWithDetails(projectId);
    if (!project) throw new NotFoundError('Project');

    // 2. Check authorization
    await this.accessService.verifyProjectAccess(userId, projectId, 'viewer');

    return project;
  }

  // Command methods
  async create(userId: string, data: CreateProjectInput): Promise<Project> {
    // 1. Validate business rules
    const slugExists = await this.projectRepo.slugExists(data.slug);
    if (slugExists) {
      throw new ConflictError('Project slug already exists');
    }

    // 2. Execute in transaction
    const project = await this.prisma.$transaction(async (tx) => {
      const project = await this.projectRepo.create(
        {
          ...data,
          ownerId: userId,
        },
        tx
      );

      await this.memberRepo.add(project.id, userId, 'owner', tx);

      return project;
    });

    // 3. Emit events (outside transaction)
    this.eventEmitter.emit('project.created', { project, userId });

    return project;
  }
}
```

## Method Naming Conventions

| Pattern   | Purpose                              | Example                    |
| --------- | ------------------------------------ | -------------------------- |
| `getXxx`  | Fetch with auth, throws if not found | `getById(userId, id)`      |
| `findXxx` | Fetch without auth, returns null     | `findBySlug(slug)`         |
| `listXxx` | Return array, may be empty           | `listForUser(userId)`      |
| `create`  | Create new entity                    | `create(userId, data)`     |
| `update`  | Update existing                      | `update(userId, id, data)` |
| `delete`  | Remove entity                        | `delete(userId, id)`       |
| `canXxx`  | Check permission                     | `canEdit(userId, id)`      |

## Authorization in Services

### Recommended: Service Handles Auth

```typescript
class ProjectService {
  async update(userId: string, projectId: string, data: UpdateInput) {
    // Service verifies authorization
    await this.accessService.verifyProjectAccess(userId, projectId, 'editor');

    // Then performs operation via repository
    return this.projectRepo.update(projectId, data);
  }
}

// Route is simple - just delegates
app.patch('/projects/:id', async (request) => {
  return projectService.update(request.userId, request.params.id, request.body);
});
```

### Why Auth in Services?

1. **Testable** - Mock accessService in tests
2. **Consistent** - All access checks in one place
3. **Reusable** - Same rules when called from workers/queues

## Error Handling

### Throw Domain Errors

```typescript
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '@/domain/errors';

class ProjectService {
  async getById(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    const hasAccess = await this.accessService.hasAccess(userId, projectId);
    if (!hasAccess) {
      throw new ForbiddenError('No access to this project');
    }

    return project;
  }
}
```

### Let Errors Propagate

```typescript
// ❌ BAD - Catching and re-throwing
async getProject(id: string) {
  try {
    return await this.projectRepo.findById(id);
  } catch (error) {
    throw new Error('Failed to get project');
  }
}

// ✅ GOOD - Let errors bubble up
async getProject(id: string) {
  return this.projectRepo.findById(id);
}
```

## Transaction Patterns

### Simple Transaction

```typescript
async createWithLanguages(userId: string, data: CreateInput, languages: string[]) {
  return this.prisma.$transaction(async (tx) => {
    const project = await this.projectRepo.create(data, tx);

    await this.languageRepo.addMany(
      project.id,
      languages.map(code => ({ code, projectId: project.id })),
      tx
    );

    await this.memberRepo.add(project.id, userId, 'owner', tx);

    return project;
  });
}
```

### Events After Transaction

```typescript
async delete(userId: string, projectId: string) {
  // Verify access
  await this.accessService.verifyProjectAccess(userId, projectId, 'owner');

  // Get data before deletion (for event)
  const project = await this.projectRepo.findById(projectId);

  // Delete in transaction
  await this.prisma.$transaction(async (tx) => {
    await this.memberRepo.deleteAllByProject(projectId, tx);
    await this.projectRepo.delete(projectId, tx);
  });

  // Emit event AFTER transaction commits
  this.eventEmitter.emit('project.deleted', { project, userId });
}
```

## Async Operations

### Queue for Background Processing

```typescript
class ImportService {
  constructor(
    private importQueue: Queue<ImportJob>,
    private accessService: AccessService
  ) {}

  async startImport(userId: string, projectId: string, file: Buffer) {
    // Validate access
    await this.accessService.verifyProjectAccess(userId, projectId, 'editor');

    // Queue for async processing
    const job = await this.importQueue.add('import-keys', {
      projectId,
      userId,
      file: file.toString('base64'),
    });

    return { jobId: job.id, status: 'queued' };
  }
}
```

## Input/Output Types

### Input DTOs

```typescript
// Use interfaces for service inputs
export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}
```

### Output Types

```typescript
// Use Prisma types for returns
import type { Prisma } from '@prisma/client';

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: {
    languages: true;
    members: { include: { user: true } };
  };
}>;
```

## Testing Services

```typescript
import { mockDeep, MockProxy } from 'vitest-mock-extended';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockProjectRepo: MockProxy<ProjectRepository>;
  let mockAccessService: MockProxy<AccessService>;

  beforeEach(() => {
    mockProjectRepo = mockDeep<ProjectRepository>();
    mockAccessService = mockDeep<AccessService>();

    service = new ProjectService(mockProjectRepo, mockAccessService);
  });

  describe('getById', () => {
    it('should throw NotFoundError when project missing', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(service.getById('user-1', 'proj-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when no access', async () => {
      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockRejectedValue(new ForbiddenError());

      await expect(service.getById('user-1', 'proj-1')).rejects.toThrow(ForbiddenError);
    });

    it('should return project when access granted', async () => {
      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockAccessService.verifyProjectAccess.mockResolvedValue(undefined);

      const result = await service.getById('user-1', 'proj-1');

      expect(result).toEqual(mockProject);
    });
  });
});
```

## Best Practices

### DO

- Inject dependencies via constructor
- Use repositories for data access
- Include userId in public methods for auth
- Throw domain-specific errors
- Emit events after transactions commit

### DON'T

- Access Prisma directly (use repositories)
- Handle HTTP concerns (request/response)
- Catch errors just to log and re-throw
- Mix query and command operations in one method

## Service Organization

```
services/
├── project.service.ts      # Project CRUD
├── key.service.ts          # Translation keys
├── translation.service.ts  # Translation values
├── access.service.ts       # Authorization
├── import.service.ts       # Import/export
└── index.ts                # Barrel exports
```
