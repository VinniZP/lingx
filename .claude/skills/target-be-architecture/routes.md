# Routes

Routes are thin HTTP adapters that validate input, dispatch to CommandBus/QueryBus, and format responses.

## Route Responsibilities

Routes should ONLY:

1. Parse and validate request input (Zod schemas)
2. Create Command or Query objects
3. Dispatch via CommandBus/QueryBus
4. Transform result to DTO
5. Set HTTP status codes

Routes should NOT:

- Contain business logic
- Call repositories directly
- Emit events
- Make authorization decisions

## Route Structure

```
apps/api/src/routes/
├── projects/
│   ├── routes.ts           # Route definitions
│   ├── handlers.ts         # Handler functions
│   └── schemas.ts          # Zod validation schemas
├── translations/
│   ├── routes.ts
│   ├── handlers.ts
│   └── schemas.ts
├── branches/
└── index.ts                # Route registration
```

## Handler Factory Pattern

```typescript
// routes/projects/handlers.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AwilixContainer } from 'awilix';
import { CommandBus, QueryBus } from '@/shared/cqrs';
import { CreateProjectCommand, GetProjectQuery, ListProjectsQuery } from '@/modules/project';
import { toProjectDto, toProjectListDto } from '@/dto/project.dto';

export function createProjectHandlers(container: AwilixContainer) {
  return {
    async create(request: FastifyRequest<{ Body: CreateProjectBody }>, reply: FastifyReply) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      const project = await commandBus.execute(
        new CreateProjectCommand(
          request.body.name,
          request.body.slug,
          request.body.sourceLanguage,
          request.body.targetLanguages,
          request.userId // From auth middleware
        )
      );

      reply.code(201);
      return toProjectDto(project);
    },

    async get(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      const queryBus = container.resolve<QueryBus>('queryBus');

      const project = await queryBus.execute(
        new GetProjectQuery(request.params.id, request.userId)
      );

      return toProjectDto(project);
    },

    async list(request: FastifyRequest<{ Querystring: ListProjectsQuery }>, reply: FastifyReply) {
      const queryBus = container.resolve<QueryBus>('queryBus');

      const result = await queryBus.execute(
        new ListProjectsQuery(request.userId, {
          page: request.query.page,
          limit: request.query.limit,
          search: request.query.search,
        })
      );

      return toProjectListDto(result);
    },

    async update(
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectBody }>,
      reply: FastifyReply
    ) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      const project = await commandBus.execute(
        new UpdateProjectCommand(request.params.id, request.body, request.userId)
      );

      return toProjectDto(project);
    },

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      await commandBus.execute(new DeleteProjectCommand(request.params.id, request.userId));

      reply.code(204);
    },
  };
}
```

## Route Definitions

```typescript
// routes/projects/routes.ts
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { createProjectHandlers } from './handlers';
import * as schemas from './schemas';

export async function projectRoutes(app: FastifyInstance, opts: { container: AwilixContainer }) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();
  const handlers = createProjectHandlers(opts.container);

  fastify.post('/', {
    onRequest: [app.authenticate],
    schema: schemas.createProject,
    handler: handlers.create,
  });

  fastify.get('/:id', {
    onRequest: [app.authenticate],
    schema: schemas.getProject,
    handler: handlers.get,
  });

  fastify.get('/', {
    onRequest: [app.authenticate],
    schema: schemas.listProjects,
    handler: handlers.list,
  });

  fastify.patch('/:id', {
    onRequest: [app.authenticate],
    schema: schemas.updateProject,
    handler: handlers.update,
  });

  fastify.delete('/:id', {
    onRequest: [app.authenticate],
    handler: handlers.delete,
  });
}
```

## Validation Schemas

```typescript
// routes/projects/schemas.ts
import { z } from 'zod';
import { createProjectSchema, projectResponseSchema } from '@lingx/shared';

export const createProject = {
  tags: ['Projects'],
  body: createProjectSchema,
  response: {
    201: projectResponseSchema,
  },
};

export const listProjects = {
  tags: ['Projects'],
  querystring: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
  }),
  response: {
    200: z.object({
      items: z.array(projectResponseSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  },
};

export const getProject = {
  tags: ['Projects'],
  params: z.object({ id: z.string().uuid() }),
  response: {
    200: projectResponseSchema,
  },
};
```

## Translation Routes (CQRS Example)

```typescript
// routes/translations/handlers.ts
export function createTranslationHandlers(container: AwilixContainer) {
  return {
    async getTranslations(
      request: FastifyRequest<{
        Params: { branchId: string };
        Querystring: TranslationsQuery;
      }>,
      reply: FastifyReply
    ) {
      const queryBus = container.resolve<QueryBus>('queryBus');

      // Query - read operation
      const result = await queryBus.execute(
        new GetTranslationsQuery(request.params.branchId, request.userId, {
          page: request.query.page,
          limit: request.query.limit,
          search: request.query.search,
          filter: request.query.filter,
        })
      );

      return toTranslationsDto(result);
    },

    async updateTranslation(
      request: FastifyRequest<{
        Params: { keyId: string };
        Body: UpdateTranslationBody;
      }>,
      reply: FastifyReply
    ) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      // Command - write operation
      const translation = await commandBus.execute(
        new UpdateTranslationCommand(
          request.params.keyId,
          request.body.language,
          request.body.value,
          request.userId
        )
      );

      return toTranslationDto(translation);
    },

    async bulkUpdate(
      request: FastifyRequest<{
        Params: { branchId: string };
        Body: BulkUpdateBody;
      }>,
      reply: FastifyReply
    ) {
      const commandBus = container.resolve<CommandBus>('commandBus');

      const translations = await commandBus.execute(
        new BulkUpdateTranslationsCommand(
          request.params.branchId,
          request.body.updates,
          request.userId
        )
      );

      return translations.map(toTranslationDto);
    },
  };
}
```

## Route Registration

```typescript
// routes/index.ts
import { FastifyInstance } from 'fastify';
import { AwilixContainer } from 'awilix';
import { projectRoutes } from './projects/routes';
import { translationRoutes } from './translations/routes';
import { branchRoutes } from './branches/routes';

export async function registerRoutes(app: FastifyInstance, container: AwilixContainer) {
  app.register(projectRoutes, {
    prefix: '/api/projects',
    container,
  });

  app.register(translationRoutes, {
    prefix: '/api/translations',
    container,
  });

  app.register(branchRoutes, {
    prefix: '/api/branches',
    container,
  });
}
```

## Error Handling

Domain errors from handlers are converted to HTTP responses:

```typescript
// plugins/error-handler.ts
import { DomainError, NotFoundError, ConflictError, ForbiddenError } from '@/shared/domain';

export async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    // Domain errors
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({
        error: error.message,
        code: error.code,
      });
    }

    // Validation errors (from Zod)
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: error.validation,
      });
    }

    // Unknown errors
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  });
}
```

## DTOs

Transform domain entities to API responses:

```typescript
// dto/project.dto.ts
import type { Project, ProjectLanguage } from '@prisma/client';

interface ProjectDto {
  id: string;
  name: string;
  slug: string;
  sourceLanguage: string;
  languages: { code: string; name: string }[];
  createdAt: string;
}

export function toProjectDto(project: Project & { languages: ProjectLanguage[] }): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    sourceLanguage: project.sourceLanguage,
    languages: project.languages.map((l) => ({
      code: l.code,
      name: l.name,
    })),
    createdAt: project.createdAt.toISOString(),
  };
}
```

## Best Practices

### DO

- Keep handlers thin (< 15 lines)
- Create Command/Query objects with request data
- Use DTOs for all responses
- Resolve buses from container
- Let errors propagate to global handler

### DON'T

- Put business logic in handlers
- Call repositories or services directly
- Emit events from routes
- Return raw Prisma models
- Handle authorization in routes

## Pattern Summary

```
HTTP Request
    │
    ▼
┌─────────┐    validate    ┌─────────┐
│  Route  │ ──────────────►│ Schema  │
└────┬────┘                └─────────┘
     │
     │ create Command/Query
     ▼
┌─────────┐    dispatch    ┌─────────┐
│ Handler │ ──────────────►│   Bus   │
└────┬────┘                └─────────┘
     │
     │ transform
     ▼
┌─────────┐
│   DTO   │ ──► HTTP Response
└─────────┘
```

Sources:

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [@fastify/awilix](https://github.com/fastify/fastify-awilix)
