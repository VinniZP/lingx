# Error Handling

Lingx uses a typed error hierarchy for consistent API error responses.

## Error Hierarchy

```
AppError (base)
├── NotFoundError        (404) - Resource doesn't exist
├── ValidationError      (400) - Invalid input data
├── BadRequestError      (400) - Malformed request
├── UnauthorizedError    (401) - Missing/invalid auth
├── ForbiddenError       (403) - Valid auth but no access
├── ConflictError        (409) - Resource already exists
└── FieldValidationError (409) - Field-level validation (forms)
```

## Error Classes

Located in `plugins/error-handler.ts`:

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'BAD_REQUEST', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

// For form field validation errors
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export class FieldValidationError extends AppError {
  public readonly fieldErrors: FieldError[];

  constructor(fieldErrors: FieldError[]) {
    super(409, 'FIELD_VALIDATION_ERROR', 'Validation failed');
    this.fieldErrors = fieldErrors;
  }
}
```

## Response Format

All errors return consistent JSON:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Project not found"
}
```

For field validation errors:

```json
{
  "statusCode": 409,
  "error": "FIELD_VALIDATION_ERROR",
  "message": "Validation failed",
  "fieldErrors": [
    { "field": "slug", "message": "Slug already exists", "code": "DUPLICATE" },
    { "field": "email", "message": "Invalid email format", "code": "INVALID" }
  ]
}
```

## Global Error Handler

```typescript
// plugins/error-handler.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async (fastify) => {
  fastify.setErrorHandler(
    async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // Log error
      request.log.error({ err: error, url: request.url });

      // Handle operational errors
      if (error instanceof AppError) {
        const response: Record<string, unknown> = {
          statusCode: error.statusCode,
          error: error.code,
          message: error.message,
        };

        // Include field errors for FieldValidationError
        if (error instanceof FieldValidationError) {
          response.fieldErrors = error.fieldErrors;
        }

        return reply.status(error.statusCode).send(response);
      }

      // Handle Zod validation errors (from schema)
      if (error.validation) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
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
  );
});
```

## Usage in Services

### Not Found

```typescript
async findByIdOrThrow(id: string) {
  const project = await this.prisma.project.findUnique({ where: { id } });
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  return project;
}
```

### Validation Error

```typescript
async create(input: CreateProjectInput) {
  if (!input.name?.trim()) {
    throw new ValidationError('Name is required');
  }
  // ...
}
```

### Conflict Error

```typescript
async create(input: CreateProjectInput) {
  const existing = await this.prisma.project.findUnique({
    where: { slug: input.slug },
  });
  if (existing) {
    throw new ConflictError('A project with this slug already exists');
  }
  // ...
}
```

### Field Validation Error (Forms)

```typescript
async create(input: CreateUserInput) {
  const errors: FieldError[] = [];

  // Check email uniqueness
  const existingEmail = await this.prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingEmail) {
    errors.push({
      field: 'email',
      message: 'Email already registered',
      code: 'DUPLICATE',
    });
  }

  // Check username uniqueness
  const existingUsername = await this.prisma.user.findUnique({
    where: { username: input.username },
  });
  if (existingUsername) {
    errors.push({
      field: 'username',
      message: 'Username already taken',
      code: 'DUPLICATE',
    });
  }

  if (errors.length > 0) {
    throw new FieldValidationError(errors);
  }

  // Create user...
}
```

## Error Codes Reference

| Error                | Status | Code                   | When to Use            |
| -------------------- | ------ | ---------------------- | ---------------------- |
| NotFoundError        | 404    | NOT_FOUND              | Resource doesn't exist |
| ValidationError      | 400    | VALIDATION_ERROR       | Invalid input format   |
| BadRequestError      | 400    | BAD_REQUEST            | Malformed request      |
| UnauthorizedError    | 401    | UNAUTHORIZED           | Missing/invalid auth   |
| ForbiddenError       | 403    | FORBIDDEN              | No access to resource  |
| ConflictError        | 409    | CONFLICT               | Duplicate resource     |
| FieldValidationError | 409    | FIELD_VALIDATION_ERROR | Form field errors      |

## Best Practices

### Use Specific Errors

```typescript
// BAD
throw new Error('Not found');

// GOOD
throw new NotFoundError('Project not found');
```

### Include Context

```typescript
// BAD
throw new NotFoundError('Not found');

// GOOD
throw new NotFoundError(`Project ${id} not found`);
```

### Use FieldValidationError for Forms

```typescript
// BAD - generic validation for form fields
throw new ValidationError('Email already exists');

// GOOD - field-specific for form handling
throw new FieldValidationError([
  { field: 'email', message: 'Email already exists', code: 'DUPLICATE' },
]);
```

### Authorization: NotFound vs Forbidden

```typescript
// For security, don't reveal resource existence
if (!member) {
  throw new NotFoundError('Project not found'); // Don't reveal it exists
}

if (member.role < requiredRole) {
  throw new ForbiddenError('Insufficient permissions'); // They know it exists
}
```

## Testing Errors

```typescript
import { describe, it, expect } from 'vitest';
import { NotFoundError, FieldValidationError } from '../plugins/error-handler';

describe('ProjectService', () => {
  it('throws NotFoundError for missing project', async () => {
    await expect(service.findByIdOrThrow('non-existent')).rejects.toThrow(NotFoundError);
  });

  it('throws FieldValidationError for duplicate slug', async () => {
    // Create first project
    await service.create({ slug: 'test', name: 'Test' });

    // Try to create duplicate
    await expect(service.create({ slug: 'test', name: 'Test 2' })).rejects.toThrow(
      FieldValidationError
    );
  });
});
```
