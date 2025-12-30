# Service Patterns

Services are the main business logic layer. They encapsulate domain operations and data access.

## Structure

```typescript
// services/project.service.ts
import type { PrismaClient } from '@prisma/client';

// Input DTOs - what the service receives
export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  userId: string;
}

// Output types - what the service returns (can use Prisma types)
export type ProjectWithLanguages = Prisma.ProjectGetPayload<{
  include: { languages: true };
}>;

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateProjectInput): Promise<ProjectWithLanguages> {
    // Validation
    if (!input.name.trim()) {
      throw new ValidationError('Name is required');
    }

    // Business logic
    const existing = await this.prisma.project.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictError('Slug already exists');
    }

    // Data access
    return this.prisma.project.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        members: {
          create: { userId: input.userId, role: 'ADMIN' },
        },
      },
      include: { languages: true },
    });
  }
}
```

## Guidelines

### 1. Constructor Injection

```typescript
// Services receive PrismaClient via constructor
constructor(private prisma: PrismaClient) {}
```

### 2. Input Types

Define clear input interfaces for each method:

```typescript
export interface UpdateProjectInput {
  name?: string;
  description?: string;
}
```

### 3. Output Types

Use Prisma's generated types with includes:

```typescript
// Define what you include
export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: {
    languages: true;
    members: { include: { user: true } };
  };
}>;
```

### 4. Validation

Validate inputs at the start of methods:

```typescript
async create(input: CreateInput): Promise<Entity> {
  // Validation first
  if (!input.name?.trim()) {
    throw new ValidationError('Name is required');
  }

  // Then business logic
  // Then data access
}
```

### 5. Transactions

Use Prisma transactions for multi-step operations:

```typescript
async createBranch(input: CreateBranchInput): Promise<Branch> {
  return this.prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({ data: { ... } });

    // Copy data in same transaction
    await tx.translationKey.createMany({ data: [...] });

    return branch;
  });
}
```

### 6. Error Throwing

Throw typed errors for exceptional cases:

```typescript
// Not found
if (!entity) {
  throw new NotFoundError('Project');
}

// Conflict
if (existing) {
  throw new ConflictError('Slug already exists');
}

// Validation
if (!isValid) {
  throw new ValidationError('Invalid input');
}

// Authorization
if (!hasAccess) {
  throw new ForbiddenError('Not authorized');
}
```

## Anti-patterns

### Don't do authorization in services

```typescript
// BAD - authorization in service
async getProject(id: string, userId: string) {
  const project = await this.findById(id);
  const isMember = await this.checkMembership(id, userId);
  if (!isMember) throw new ForbiddenError();
  return project;
}

// GOOD - authorization in route or use case
// Service just provides data
async findById(id: string) {
  return this.prisma.project.findUnique({ where: { id } });
}
```

### Don't mix HTTP concerns

```typescript
// BAD - HTTP in service
async create(req: FastifyRequest) {
  const { name } = req.body;
  // ...
}

// GOOD - typed input
async create(input: CreateProjectInput) {
  // ...
}
```

## Example: Complete Service

```typescript
import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../errors/index.js';

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  userId: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export type ProjectWithLanguages = Prisma.ProjectGetPayload<{
  include: { languages: true };
}>;

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<ProjectWithLanguages | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: { languages: true },
    });
  }

  async create(input: CreateProjectInput): Promise<ProjectWithLanguages> {
    if (!input.name.trim()) {
      throw new ValidationError('Name is required');
    }

    const existing = await this.prisma.project.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictError('Slug already exists');
    }

    return this.prisma.project.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        members: {
          create: { userId: input.userId, role: 'ADMIN' },
        },
      },
      include: { languages: true },
    });
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectWithLanguages> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundError('Project');
    }

    return this.prisma.project.update({
      where: { id },
      data: input,
      include: { languages: true },
    });
  }
}
```
