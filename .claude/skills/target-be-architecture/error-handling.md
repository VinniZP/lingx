# Error Handling Strategy

How errors flow through the CQRS-lite architecture.

## Error Flow

```
Handler throws → Bus propagates → Route catches → Error plugin formats → HTTP response
```

## Error Types

### Domain Errors (Application Layer)

Located in `src/plugins/error-handler.ts`:

| Error Class            | HTTP Status | When to Use                |
| ---------------------- | ----------- | -------------------------- |
| `NotFoundError`        | 404         | Resource doesn't exist     |
| `ValidationError`      | 400         | Business rule violation    |
| `BadRequestError`      | 400         | Malformed request data     |
| `UnauthorizedError`    | 401         | Missing/invalid auth       |
| `ForbiddenError`       | 403         | Insufficient permissions   |
| `FieldValidationError` | 409         | Field-level errors (forms) |

### Usage Examples

```typescript
// Resource not found
const environment = await this.repository.findById(id);
if (!environment) {
  throw new NotFoundError('Environment');
}

// Business rule violation
if (branch.space.projectId !== projectId) {
  throw new ValidationError('Branch must belong to a space in this project');
}

// Field-level error (for form display)
const existing = await this.repository.findBySlug(projectId, slug);
if (existing) {
  throw new FieldValidationError([
    {
      field: 'slug',
      message: 'An environment with this slug already exists',
      code: 'ENVIRONMENT_SLUG_EXISTS',
    },
  ]);
}
```

## Error Handling Patterns

### In Command Handlers

```typescript
async execute(command: CreateCommand): Promise<Result> {
  // 1. Authorization first (fail fast)
  await this.accessService.verifyProjectAccess(userId, projectId, ['MANAGER']);

  // 2. Validate existence
  const parent = await this.repository.findById(command.parentId);
  if (!parent) {
    throw new NotFoundError('Parent');
  }

  // 3. Validate business rules
  if (!isValidSlug(command.slug)) {
    throw new ValidationError('Invalid slug format');
  }

  // 4. Check uniqueness (field-level for forms)
  const existing = await this.repository.findBySlug(command.slug);
  if (existing) {
    throw new FieldValidationError([
      { field: 'slug', message: 'Already exists', code: 'SLUG_EXISTS' },
    ]);
  }

  // 5. Execute operation
  return this.repository.create(command);
}
```

### In Query Handlers (Information Disclosure Prevention)

```typescript
async execute(query: GetQuery): Promise<Result> {
  // 1. Fetch resource
  const resource = await this.repository.findById(query.id);
  if (!resource) {
    throw new NotFoundError('Resource');
  }

  // 2. Authorization (hide existence from unauthorized users)
  try {
    await this.accessService.verifyProjectAccess(query.userId, resource.projectId);
  } catch (error) {
    // Convert 403 to 404 to prevent information disclosure
    if (error instanceof Error && 'code' in error && error.code === 'FORBIDDEN') {
      throw new NotFoundError('Resource');
    }
    throw error;
  }

  return resource;
}
```

### Handling Prisma Errors (Race Conditions)

```typescript
import { Prisma } from '@prisma/client';

async execute(command: CreateCommand): Promise<Result> {
  try {
    return await this.repository.create(command);
  } catch (error) {
    // Handle unique constraint violation (P2002)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[target.length - 1] ?? 'unknown';
      throw new FieldValidationError([
        { field, message: `${field} already exists`, code: `${field.toUpperCase()}_EXISTS` },
      ]);
    }
    throw error;
  }
}
```

## Error Response Format

All errors return consistent JSON:

```json
{
  "statusCode": 409,
  "error": "FIELD_VALIDATION_ERROR",
  "message": "Validation failed",
  "code": "FIELD_VALIDATION_ERROR",
  "fieldErrors": [
    {
      "field": "slug",
      "message": "An environment with this slug already exists",
      "code": "ENVIRONMENT_SLUG_EXISTS"
    }
  ]
}
```

## Logging Strategy

| Error Type             | Log Level | Details Logged                   |
| ---------------------- | --------- | -------------------------------- |
| `FieldValidationError` | `info`    | Field errors, request method/url |
| `AppError` (4xx)       | `warn`    | Error, request details           |
| Validation errors      | `info`    | Validation details               |
| Unexpected errors      | `error`   | Full error, request context      |

## Best Practices

1. **Fail fast** - Check authorization before expensive operations
2. **Be specific** - Use appropriate error type for the situation
3. **Field errors for forms** - Use `FieldValidationError` when UI needs to highlight fields
4. **Hide sensitive info** - Return 404 instead of 403 for resource-level auth in queries
5. **Log appropriately** - Unexpected errors get `error`, expected get `warn`/`info`
6. **Handle race conditions** - Catch Prisma P2002 and convert to field errors
7. **Don't expose internals** - Production hides unexpected error messages

## Event Handler Errors

Event handlers use fire-and-forget semantics - errors are logged but don't propagate:

```typescript
// EventBus catches and logs handler errors
this.logger.error(
  {
    eventType: eventType.name,
    handler: handlerNames[i],
    err: result.reason,
  },
  'Event handler execution failed'
);
```

This ensures one failing handler doesn't affect others or the main request.
