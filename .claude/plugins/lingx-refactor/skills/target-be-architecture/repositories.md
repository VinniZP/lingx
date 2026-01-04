# Repository Pattern

Repositories abstract data access, keeping Prisma details out of services.

## Why Repositories?

### Without Repository (Anti-pattern)

```typescript
// Service directly uses Prisma
class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async getProject(id: string) {
    // Service knows about Prisma API
    return this.prisma.project.findUnique({
      where: { id },
      include: { languages: true, members: true },
    });
  }
}
```

Problems:

- Service tightly coupled to Prisma
- Hard to test without database
- Prisma include logic spread across services
- Can't swap database easily

### With Repository (Clean)

```typescript
// Service uses repository abstraction
class ProjectService {
  constructor(private projectRepo: ProjectRepository) {}

  async getProject(id: string) {
    // Service only knows repository interface
    return this.projectRepo.findByIdWithDetails(id);
  }
}
```

Benefits:

- Service decoupled from database
- Easy to mock in tests
- Prisma logic centralized
- Can swap to different database

## Repository Structure

```typescript
// repositories/project.repository.ts
import type { PrismaClient, Project, Prisma } from '@prisma/client';

// Types for repository returns
export type ProjectWithLanguages = Prisma.ProjectGetPayload<{
  include: { languages: true };
}>;

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: { languages: true; members: { include: { user: true } } };
}>;

export class ProjectRepository {
  constructor(private prisma: PrismaClient) {}

  // Basic CRUD
  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { slug } });
  }

  // With specific includes
  async findByIdWithLanguages(id: string): Promise<ProjectWithLanguages | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: { languages: true },
    });
  }

  async findByIdWithDetails(id: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        languages: true,
        members: { include: { user: true } },
      },
    });
  }

  // List with filtering
  async findByOwner(ownerId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Create
  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  // Update
  async update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  // Delete
  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  // Check existence
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.project.count({ where: { id } });
    return count > 0;
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.project.count({ where: { slug } });
    return count > 0;
  }
}
```

## Naming Conventions

| Method                | Purpose                    | Returns                 |
| --------------------- | -------------------------- | ----------------------- |
| `findById(id)`        | Get by primary key         | `Entity \| null`        |
| `findByXxx(value)`    | Get by unique field        | `Entity \| null`        |
| `findByIdWithXxx(id)` | Get with specific includes | `EntityWithXxx \| null` |
| `findAllByXxx(value)` | List by field              | `Entity[]`              |
| `create(data)`        | Create new                 | `Entity`                |
| `update(id, data)`    | Update existing            | `Entity`                |
| `delete(id)`          | Delete                     | `void`                  |
| `exists(id)`          | Check existence            | `boolean`               |
| `count(filter)`       | Count matching             | `number`                |

## Complex Queries

### Pagination

```typescript
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

async findPaginated(
  filter: ProjectFilter,
  page: number,
  pageSize: number
): Promise<PaginatedResult<Project>> {
  const where = this.buildWhereClause(filter);

  const [items, total] = await this.prisma.$transaction([
    this.prisma.project.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.project.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}
```

### Search

```typescript
async search(query: string, limit = 20): Promise<Project[]> {
  return this.prisma.project.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });
}
```

### Bulk Operations

```typescript
async createMany(items: Prisma.ProjectCreateManyInput[]): Promise<number> {
  const result = await this.prisma.project.createMany({ data: items });
  return result.count;
}

async updateMany(
  ids: string[],
  data: Prisma.ProjectUpdateInput
): Promise<number> {
  const result = await this.prisma.project.updateMany({
    where: { id: { in: ids } },
    data,
  });
  return result.count;
}
```

## Transactions

### Via Service Orchestration

```typescript
// Repository methods stay simple
class ProjectRepository {
  async create(data: CreateData): Promise<Project> { ... }
  async addMember(projectId: string, userId: string): Promise<void> { ... }
}

// Service handles transaction
class ProjectService {
  async createWithOwner(data: CreateData, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Create project
      const project = await this.projectRepo.create(data);
      // Add owner as member
      await this.memberRepo.add(project.id, ownerId, 'owner');
      return project;
    });
  }
}
```

### Transaction-Aware Repositories

```typescript
// Repository accepts optional transaction client
class ProjectRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateData, tx?: Prisma.TransactionClient): Promise<Project> {
    const client = tx ?? this.prisma;
    return client.project.create({ data });
  }
}
```

## Testing Repositories

```typescript
import { mockDeep } from 'vitest-mock-extended';

describe('ProjectRepository', () => {
  let repo: ProjectRepository;
  let mockPrisma: MockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    repo = new ProjectRepository(mockPrisma);
  });

  it('should find project by id', async () => {
    const mockProject = { id: '1', name: 'Test', slug: 'test' };
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);

    const result = await repo.findById('1');

    expect(result).toEqual(mockProject);
    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });
});
```

## Best Practices

### DO

- Keep repositories focused on data access only
- Use typed return values (Prisma.XxxGetPayload)
- Return null for not found, let service throw
- Name methods by what they return

### DON'T

- Put business logic in repositories
- Throw business errors from repositories
- Make repositories call other repositories
- Include authorization checks in repositories

Sources:

- [Prisma Integration Testing](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
