# TDD Session: CreateProjectHandler

Complete walkthrough of TDD for a command handler.

## Setup

Create test file first:

```
modules/project/commands/__tests__/CreateProjectHandler.test.ts
```

## Iteration 1: Happy Path

### RED - Write Failing Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProjectHandler } from '../CreateProjectHandler';
import { CreateProjectCommand } from '../CreateProjectCommand';

const createMockRepository = () => ({
  create: vi.fn(),
  findBySlug: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
});

describe('CreateProjectHandler', () => {
  let handler: CreateProjectHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new CreateProjectHandler(
      mockRepo as unknown as ProjectRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  it('should create project with valid input', async () => {
    const command = new CreateProjectCommand({
      name: 'My Project',
      slug: 'my-project',
      userId: 'user-123',
    });

    mockRepo.create.mockResolvedValue({
      id: 'proj-1',
      name: 'My Project',
      slug: 'my-project',
      ownerId: 'user-123',
    });

    const result = await handler.execute(command);

    expect(result.id).toBe('proj-1');
    expect(result.name).toBe('My Project');
  });
});
```

Run: `pnpm --filter @lingx/api test modules/project/commands/__tests__/CreateProjectHandler.test.ts`

Result: **FAIL** - CreateProjectHandler does not exist

### GREEN - Minimal Implementation

Create `modules/project/commands/CreateProjectCommand.ts`:

```typescript
export class CreateProjectCommand {
  readonly name: string;
  readonly slug: string;
  readonly userId: string;

  constructor(data: { name: string; slug: string; userId: string }) {
    this.name = data.name;
    this.slug = data.slug;
    this.userId = data.userId;
  }
}
```

Create `modules/project/commands/CreateProjectHandler.ts`:

```typescript
import { CreateProjectCommand } from './CreateProjectCommand';

export class CreateProjectHandler {
  constructor(
    private repository: ProjectRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: CreateProjectCommand) {
    const project = await this.repository.create({
      name: command.name,
      slug: command.slug,
      ownerId: command.userId,
    });
    return project;
  }
}
```

Run tests: **PASS**

## Iteration 2: Duplicate Slug

### RED - Write Failing Test

```typescript
it('should throw ConflictError when slug exists', async () => {
  const command = new CreateProjectCommand({
    name: 'My Project',
    slug: 'existing-slug',
    userId: 'user-123',
  });

  mockRepo.findBySlug.mockResolvedValue({ id: 'existing' });

  await expect(handler.execute(command)).rejects.toThrow(ConflictError);
  expect(mockRepo.create).not.toHaveBeenCalled();
});
```

Run: **FAIL** - Handler doesn't check for existing slug

### GREEN - Add Slug Check

```typescript
async execute(command: CreateProjectCommand) {
  const existing = await this.repository.findBySlug(command.slug);
  if (existing) {
    throw new ConflictError('Project slug already exists');
  }

  const project = await this.repository.create({
    name: command.name,
    slug: command.slug,
    ownerId: command.userId,
  });
  return project;
}
```

Run: **PASS**

## Iteration 3: Event Emission

### RED - Write Failing Test

```typescript
it('should emit ProjectCreated event', async () => {
  const command = new CreateProjectCommand({
    name: 'My Project',
    slug: 'my-project',
    userId: 'user-123',
  });

  mockRepo.findBySlug.mockResolvedValue(null);
  mockRepo.create.mockResolvedValue({
    id: 'proj-1',
    name: 'My Project',
    slug: 'my-project',
    ownerId: 'user-123',
  });

  await handler.execute(command);

  expect(mockEventBus.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'ProjectCreated',
      payload: { projectId: 'proj-1', userId: 'user-123' },
    })
  );
});
```

Run: **FAIL** - Event not published

### GREEN - Add Event Publishing

```typescript
async execute(command: CreateProjectCommand) {
  const existing = await this.repository.findBySlug(command.slug);
  if (existing) {
    throw new ConflictError('Project slug already exists');
  }

  const project = await this.repository.create({
    name: command.name,
    slug: command.slug,
    ownerId: command.userId,
  });

  await this.eventBus.publish({
    type: 'ProjectCreated',
    payload: { projectId: project.id, userId: command.userId },
  });

  return project;
}
```

Run: **PASS**

## Iteration 4: Validation

### RED - Write Failing Test

```typescript
it('should throw ValidationError when name is empty', async () => {
  const command = new CreateProjectCommand({
    name: '',
    slug: 'valid-slug',
    userId: 'user-123',
  });

  await expect(handler.execute(command)).rejects.toThrow(ValidationError);
});
```

Run: **FAIL**

### GREEN - Add Validation

```typescript
async execute(command: CreateProjectCommand) {
  if (!command.name.trim()) {
    throw new ValidationError('Project name is required');
  }

  // ... rest of implementation
}
```

Run: **PASS**

## REFACTOR Phase

All tests green. Now clean up:

1. Extract validation to private method
2. Extract event creation to private method
3. Apply consistent error messages

```typescript
export class CreateProjectHandler {
  constructor(
    private repository: ProjectRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: CreateProjectCommand) {
    this.validate(command);
    await this.ensureSlugAvailable(command.slug);

    const project = await this.repository.create({
      name: command.name,
      slug: command.slug,
      ownerId: command.userId,
    });

    await this.publishEvent(project, command.userId);

    return project;
  }

  private validate(command: CreateProjectCommand) {
    if (!command.name.trim()) {
      throw new ValidationError('Project name is required');
    }
  }

  private async ensureSlugAvailable(slug: string) {
    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new ConflictError('Project slug already exists');
    }
  }

  private async publishEvent(project: Project, userId: string) {
    await this.eventBus.publish({
      type: 'ProjectCreated',
      payload: { projectId: project.id, userId },
    });
  }
}
```

Run tests after each extraction: **PASS**

## Final Test File

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProjectHandler } from '../CreateProjectHandler';
import { CreateProjectCommand } from '../CreateProjectCommand';
import { ConflictError, ValidationError } from '@/errors';

const createMockRepository = () => ({
  create: vi.fn(),
  findBySlug: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
});

describe('CreateProjectHandler', () => {
  let handler: CreateProjectHandler;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockEventBus = createMockEventBus();
    handler = new CreateProjectHandler(
      mockRepo as unknown as ProjectRepository,
      mockEventBus as unknown as IEventBus
    );
  });

  it('should create project with valid input', async () => {
    const command = new CreateProjectCommand({
      name: 'My Project',
      slug: 'my-project',
      userId: 'user-123',
    });

    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      id: 'proj-1',
      name: 'My Project',
      slug: 'my-project',
      ownerId: 'user-123',
    });

    const result = await handler.execute(command);

    expect(result.id).toBe('proj-1');
    expect(result.name).toBe('My Project');
  });

  it('should throw ConflictError when slug exists', async () => {
    const command = new CreateProjectCommand({
      name: 'My Project',
      slug: 'existing-slug',
      userId: 'user-123',
    });

    mockRepo.findBySlug.mockResolvedValue({ id: 'existing' });

    await expect(handler.execute(command)).rejects.toThrow(ConflictError);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should emit ProjectCreated event', async () => {
    const command = new CreateProjectCommand({
      name: 'My Project',
      slug: 'my-project',
      userId: 'user-123',
    });

    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      id: 'proj-1',
      name: 'My Project',
      slug: 'my-project',
      ownerId: 'user-123',
    });

    await handler.execute(command);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ProjectCreated',
        payload: { projectId: 'proj-1', userId: 'user-123' },
      })
    );
  });

  it('should throw ValidationError when name is empty', async () => {
    const command = new CreateProjectCommand({
      name: '',
      slug: 'valid-slug',
      userId: 'user-123',
    });

    await expect(handler.execute(command)).rejects.toThrow(ValidationError);
  });
});
```
