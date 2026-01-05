# Integration Testing

Integration tests verify components working together with real dependencies.

## Database Testing Strategy

Use transaction rollback for fast, isolated tests:

1. Seed database once before all tests
2. Wrap each test in a transaction
3. Rollback after each test

```typescript
// tests/helpers/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Run once before all tests
  await prisma.$executeRaw`BEGIN`;
}

export async function cleanupTestDatabase() {
  await prisma.$executeRaw`ROLLBACK`;
}
```

## Vitest Environment for Prisma

```typescript
// vitest.config.integration.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/helpers/setup.ts'],
    pool: 'forks', // Isolate tests
    poolOptions: {
      forks: {
        singleFork: true, // Share DB connection
      },
    },
  },
});
```

## Test Setup with Transactions

```typescript
// tests/helpers/with-transaction.ts
import { prisma } from '@/lib/prisma';
import { beforeEach, afterEach } from 'vitest';

export function useTransaction() {
  beforeEach(async () => {
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    await prisma.$executeRaw`ROLLBACK`;
  });
}
```

## Testing Fastify Routes

Use Fastify's `inject()` method for HTTP testing without a socket:

```typescript
// tests/helpers/create-test-app.ts
import { buildApp } from '@/app';

export async function createTestApp() {
  const app = await buildApp({
    logger: false,
  });
  await app.ready();
  return app;
}
```

### Route Integration Test

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '../helpers/create-test-app';
import type { FastifyInstance } from 'fastify';

describe('POST /api/projects', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create project with valid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: {
        authorization: 'Bearer test-token',
      },
      payload: {
        name: 'Test Project',
        slug: 'test-project',
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();
    expect(body.name).toBe('Test Project');
    expect(body.slug).toBe('test-project');
    expect(body.id).toBeDefined();
  });

  it('should return 400 for invalid slug', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: {
        authorization: 'Bearer test-token',
      },
      payload: {
        name: 'Test',
        slug: 'Invalid Slug!', // Invalid characters
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('slug');
  });

  it('should return 401 without auth', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Test', slug: 'test' },
    });

    expect(response.statusCode).toBe(401);
  });
});
```

## Testing with Authenticated User

```typescript
// tests/helpers/auth.ts
import { createTestApp } from './create-test-app';
import { prisma } from '@/lib/prisma';
import { signJwt } from '@/utils/jwt';

export async function createAuthenticatedApp() {
  const app = await createTestApp();

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  const token = signJwt({ userId: user.id });

  // Helper to inject with auth
  const injectWithAuth = (options: InjectOptions) =>
    app.inject({
      ...options,
      headers: {
        ...options.headers,
        authorization: `Bearer ${token}`,
      },
    });

  return { app, user, token, injectWithAuth };
}

// Usage
describe('authenticated routes', () => {
  it('should access protected resource', async () => {
    const { injectWithAuth, user } = await createAuthenticatedApp();

    const response = await injectWithAuth({
      method: 'GET',
      url: '/api/me',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(user.id);
  });
});
```

## Testing Database Operations

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ProjectService } from '@/services/project-service';
import { useTransaction } from '../helpers/with-transaction';

describe('ProjectService Integration', () => {
  useTransaction();

  let service: ProjectService;

  beforeEach(() => {
    service = new ProjectService(prisma);
  });

  it('should create and retrieve project', async () => {
    const created = await service.create({
      name: 'Test Project',
      slug: 'test-project',
      ownerId: 'user-1',
    });

    const found = await service.findBySlug('test-project');

    expect(found).toEqual(created);
  });

  it('should enforce unique slug constraint', async () => {
    await service.create({
      name: 'First',
      slug: 'unique-slug',
      ownerId: 'user-1',
    });

    await expect(
      service.create({
        name: 'Second',
        slug: 'unique-slug',
        ownerId: 'user-1',
      })
    ).rejects.toThrow();
  });
});
```

## Test Data Factories

```typescript
// tests/helpers/factories.ts
import { prisma } from '@/lib/prisma';
import { faker } from '@faker-js/faker';

export async function createTestUser(overrides?: Partial<UserCreateInput>) {
  return prisma.user.create({
    data: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      ...overrides,
    },
  });
}

export async function createTestProject(ownerId: string, overrides?: Partial<ProjectCreateInput>) {
  return prisma.project.create({
    data: {
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      ownerId,
      ...overrides,
    },
  });
}

export async function createTestKey(
  projectId: string,
  overrides?: Partial<TranslationKeyCreateInput>
) {
  return prisma.translationKey.create({
    data: {
      name: faker.lorem.words(3).replace(/\s/g, '.'),
      projectId,
      ...overrides,
    },
  });
}
```

## Testing Error Responses

```typescript
describe('error handling', () => {
  it('should return 404 for non-existent resource', async () => {
    const { injectWithAuth } = await createAuthenticatedApp();

    const response = await injectWithAuth({
      method: 'GET',
      url: '/api/projects/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: 'Not Found',
      message: expect.stringContaining('Project'),
    });
  });

  it('should return 403 for unauthorized access', async () => {
    const { injectWithAuth } = await createAuthenticatedApp();

    // Create project owned by different user
    const otherUser = await createTestUser();
    const project = await createTestProject(otherUser.id);

    const response = await injectWithAuth({
      method: 'DELETE',
      url: `/api/projects/${project.id}`,
    });

    expect(response.statusCode).toBe(403);
  });
});
```

## Performance Considerations

### Seed Once, Rollback Per Test

```typescript
// tests/helpers/seed.ts
import { prisma } from '@/lib/prisma';

export async function seedTestData() {
  // Create shared test data
  const user = await prisma.user.create({
    data: { email: 'seed@test.com', name: 'Seed User' },
  });

  const project = await prisma.project.create({
    data: { name: 'Seed Project', slug: 'seed', ownerId: user.id },
  });

  return { user, project };
}

// Run once before test suite
let seedData: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  seedData = await seedTestData();
});
```

### Parallel Test Isolation

```typescript
// Use unique identifiers per test
it('should handle concurrent operations', async () => {
  const uniqueSlug = `test-${Date.now()}-${Math.random()}`;

  const response = await injectWithAuth({
    method: 'POST',
    url: '/api/projects',
    payload: { name: 'Test', slug: uniqueSlug },
  });

  expect(response.statusCode).toBe(201);
});
```
