---
description: Scaffold a new API endpoint following Lingx clean architecture
argument-hint: <resource-name> (e.g., glossary-term, webhook)
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(pnpm:*)
---

Scaffold a complete API endpoint for resource: **$ARGUMENTS**

Use the `target-be-architecture` skill to ensure all code follows Lingx backend patterns.

## Step 1: Analyze Resource & Context

Parse the resource name and determine:

- Singular/plural forms (e.g., glossary-term → glossaryTerm / glossaryTerms)
- Parent resource relationships (project-scoped? space-scoped? branch-scoped?)
- Required operations (CRUD, bulk, specialized)

Reference existing patterns in `apps/api/src/routes/` and `apps/api/src/services/`.

## Step 2: Create Zod Schemas in @lingx/shared

File: `packages/shared/src/validation/${resource}.schema.ts`

```typescript
import { z } from 'zod';

// Input schemas
export const create${PascalCase}Schema = z.object({
  // Required fields from resource analysis
});

export const update${PascalCase}Schema = create${PascalCase}Schema.partial();

// Query/filter schema (if list endpoint has filters)
export const ${camelCase}QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
  // Additional filters
});

// Response schema
export const ${camelCase}ResponseSchema = z.object({
  id: z.string(),
  // Response fields
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(),
});

// Types
export type Create${PascalCase}Input = z.infer<typeof create${PascalCase}Schema>;
export type Update${PascalCase}Input = z.infer<typeof update${PascalCase}Schema>;
export type ${PascalCase}Response = z.infer<typeof ${camelCase}ResponseSchema>;
```

Export from `packages/shared/src/validation/index.ts`.

## Step 3: Create DTO Transformer

File: `apps/api/src/dto/${resource}.dto.ts`

```typescript
import type { ${PrismaModel} } from '@prisma/client';
import type { ${PascalCase}Response } from '@lingx/shared';

export function to${PascalCase}Dto(entity: ${PrismaModel}): ${PascalCase}Response {
  return {
    id: entity.id,
    // Map fields, convert Date to ISO string
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
```

Add export to `apps/api/src/dto/index.ts`.

## Step 4: Create Service

File: `apps/api/src/services/${resource}.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import type { Create${PascalCase}Input, Update${PascalCase}Input } from '@lingx/shared';
import { NotFoundError, ValidationError } from '../plugins/error-handler';

export interface ${PascalCase}WithRelations {
  // Define interface for Prisma result with includes
}

export class ${PascalCase}Service {
  constructor(private prisma: PrismaClient) {}

  async create(input: Create${PascalCase}Input & { /* context like userId, projectId */ }): Promise<${PascalCase}WithRelations> {
    // Validate business rules
    // Create entity
    return this.prisma.${camelCase}.create({
      data: { ...input },
      include: { /* relations */ },
    });
  }

  async findById(id: string): Promise<${PascalCase}WithRelations | null> {
    return this.prisma.${camelCase}.findUnique({
      where: { id },
      include: { /* relations */ },
    });
  }

  async findByIdOrThrow(id: string): Promise<${PascalCase}WithRelations> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundError('${PascalCase} not found');
    }
    return entity;
  }

  async findMany(filter: { /* filter options */ }): Promise<${PascalCase}WithRelations[]> {
    return this.prisma.${camelCase}.findMany({
      where: filter,
      include: { /* relations */ },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: Update${PascalCase}Input): Promise<${PascalCase}WithRelations> {
    await this.findByIdOrThrow(id); // Ensure exists
    return this.prisma.${camelCase}.update({
      where: { id },
      data: input,
      include: { /* relations */ },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id); // Ensure exists
    await this.prisma.${camelCase}.delete({ where: { id } });
  }
}
```

## Step 5: Create Routes

File: `apps/api/src/routes/${resource}.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  create${PascalCase}Schema,
  update${PascalCase}Schema,
  ${camelCase}ResponseSchema,
  ${camelCase}QuerySchema,
} from '@lingx/shared';
import { ${PascalCase}Service } from '../services/${resource}.service';
import { AccessService } from '../services/access.service';
import { to${PascalCase}Dto } from '../dto/${resource}.dto';

const ${camelCase}Routes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const service = new ${PascalCase}Service(fastify.prisma);
  const accessService = new AccessService(fastify.prisma);

  // GET /api/${resource}s
  app.get('/', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['${PascalCase}'],
      querystring: ${camelCase}QuerySchema,
      response: { 200: z.array(${camelCase}ResponseSchema) },
    },
  }, async (request) => {
    // If scoped to project/branch, verify access first
    // const { projectId } = request.query;
    // await accessService.verifyProjectAccess(request.userId, projectId, 'viewer');

    const items = await service.findMany({ /* filter from query */ });
    return items.map(to${PascalCase}Dto);
  });

  // GET /api/${resource}s/:id
  app.get('/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['${PascalCase}'],
      params: z.object({ id: z.string() }),
      response: { 200: ${camelCase}ResponseSchema },
    },
  }, async (request) => {
    const item = await service.findByIdOrThrow(request.params.id);
    // Verify access if scoped
    return to${PascalCase}Dto(item);
  });

  // POST /api/${resource}s
  app.post('/', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['${PascalCase}'],
      body: create${PascalCase}Schema,
      response: { 201: ${camelCase}ResponseSchema },
    },
  }, async (request, reply) => {
    // Verify access if scoped
    const item = await service.create({
      ...request.body,
      // Add context: userId: request.userId
    });
    return reply.status(201).send(to${PascalCase}Dto(item));
  });

  // PATCH /api/${resource}s/:id
  app.patch('/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['${PascalCase}'],
      params: z.object({ id: z.string() }),
      body: update${PascalCase}Schema,
      response: { 200: ${camelCase}ResponseSchema },
    },
  }, async (request) => {
    // Verify access if scoped
    const item = await service.update(request.params.id, request.body);
    return to${PascalCase}Dto(item);
  });

  // DELETE /api/${resource}s/:id
  app.delete('/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['${PascalCase}'],
      params: z.object({ id: z.string() }),
      response: { 204: z.null() },
    },
  }, async (request, reply) => {
    // Verify access if scoped
    await service.delete(request.params.id);
    return reply.status(204).send();
  });
};

export default ${camelCase}Routes;
```

## Step 6: Register Routes

Add to `apps/api/src/app.ts`:

```typescript
import ${camelCase}Routes from './routes/${resource}';

// In route registration section:
app.register(${camelCase}Routes, { prefix: '/api/${resource}s' });
```

## Step 7: Create Integration Tests

File: `apps/api/tests/integration/${resource}.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';

describe('${PascalCase} API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let prisma: PrismaClient;
  let authToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await buildApp();
    // Setup: create test user, get auth token
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
  });

  describe('POST /api/${resource}s', () => {
    it('should create a new ${camelCase}', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/${resource}s',
        payload: {
          /* valid input */
        },
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
    });

    it('should return 400 for invalid input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/${resource}s',
        payload: {
          /* invalid input */
        },
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/${resource}s/:id', () => {
    it('should return 404 for non-existent ${camelCase}', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/${resource}s/non-existent-id',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
```

## Step 8: Summary

After scaffolding, provide:

1. List of all created/modified files
2. Prisma schema additions needed (model definition)
3. Migration command: `npx prisma migrate dev --name add_${resource}`
4. How to test: `pnpm --filter @lingx/api test`
