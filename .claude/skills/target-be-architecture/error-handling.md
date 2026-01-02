# Error Handling

Lingx uses a typed error hierarchy for consistent error handling across the API.

## Error Hierarchy

```
AppError (base)
  ├── NotFoundError     (404)
  ├── ValidationError   (400)
  ├── UnauthorizedError (401)
  ├── ForbiddenError    (403)
  └── ConflictError     (409)
```

## Error Classes

```typescript
// errors/index.ts

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
  }
}
```

## Usage in Services

```typescript
import { NotFoundError, ValidationError, ConflictError } from '../errors/index.js';

export class ProjectService {
  async findById(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundError('Project');
    }

    return project;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    // Validation error
    if (!input.name?.trim()) {
      throw new ValidationError('Name is required');
    }

    // Conflict error
    const existing = await this.prisma.project.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictError('Slug already exists');
    }

    return this.prisma.project.create({ data: input });
  }
}
```

## Global Error Handler

```typescript
// plugins/error-handler.ts

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/index.js';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
  });

  // Handle operational errors (expected)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.validation,
    });
  }

  // Unexpected errors - don't leak details
  return reply.status(500).send({
    statusCode: 500,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
```

## Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Project not found",
  "details": {
    "id": "abc123"
  }
}
```

## Best Practices

### 1. Use specific error types

```typescript
// BAD - generic error
throw new Error('Project not found');

// GOOD - typed error
throw new NotFoundError('Project');
```

### 2. Include helpful details

```typescript
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: input.email,
  expected: 'valid email address',
});
```

### 3. Check before throwing

```typescript
// BAD - throw inside map/filter
items.map(item => {
  if (!item.valid) throw new ValidationError('Invalid item');
});

// GOOD - collect errors, then throw
const invalid = items.filter(item => !item.valid);
if (invalid.length > 0) {
  throw new ValidationError('Invalid items', {
    invalidItems: invalid.map(i => i.id),
  });
}
```

### 4. Authorization vs Not Found

For security, don't reveal resource existence to unauthorized users:

```typescript
// If user doesn't have access to project, they shouldn't know it exists
async getProject(id: string, userId: string) {
  const project = await this.projectService.findById(id);
  const isMember = await this.projectService.checkMembership(id, userId);

  // Don't reveal existence to non-members
  if (!project || !isMember) {
    throw new NotFoundError('Project');
  }

  return project;
}
```

### 5. Log appropriately

```typescript
// Operational errors - debug level
if (error instanceof AppError) {
  request.log.debug({ err: error }, 'Operational error');
}

// Unexpected errors - error level
request.log.error({ err: error }, 'Unexpected error');
```

## Error Codes Reference

| Error | Status | Code | When to Use |
|-------|--------|------|-------------|
| NotFoundError | 404 | NOT_FOUND | Resource doesn't exist |
| ValidationError | 400 | VALIDATION_ERROR | Invalid input data |
| UnauthorizedError | 401 | UNAUTHORIZED | Missing/invalid auth |
| ForbiddenError | 403 | FORBIDDEN | Valid auth but no access |
| ConflictError | 409 | CONFLICT | Resource already exists |

## Testing Errors

```typescript
import { describe, it, expect } from 'vitest';
import { NotFoundError, ValidationError } from '../errors/index.js';

describe('ProjectService', () => {
  it('throws NotFoundError for missing project', async () => {
    const service = new ProjectService(prisma);

    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError for empty name', async () => {
    const service = new ProjectService(prisma);

    await expect(
      service.create({ name: '', slug: 'test', userId: 'user1' })
    ).rejects.toThrow(ValidationError);
  });
});
```
