# Result Pattern

Use the Result pattern for operations that can have partial success, multiple error types, or need explicit error handling.

## When to Use

| Scenario | Use Result? |
|----------|-------------|
| Simple CRUD (create/read/update/delete) | No - throw errors |
| Bulk operations (some may fail) | **Yes** |
| Complex validation with multiple errors | **Yes** |
| Operations that return warnings | **Yes** |
| Operations where caller needs error details | **Yes** |

## Type Definition

```typescript
// lib/result.ts

/**
 * Result type for operations that can succeed or fail.
 * Inspired by Rust's Result and fp-ts Either.
 */
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Check if result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T } {
  return result.ok;
}

/**
 * Check if result is failure
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/**
 * Unwrap result, throwing if error
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) {
    return result.data;
  }
  throw result.error;
}

/**
 * Map success value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.data));
  }
  return result;
}
```

## Usage in Services

### Bulk Operations

```typescript
import { Result, ok, err } from '../lib/result.js';

export interface BulkCreateResult {
  created: number;
  failed: Array<{ key: string; reason: string }>;
}

export class TranslationService {
  async bulkCreateKeys(
    branchId: string,
    keys: string[]
  ): Promise<Result<BulkCreateResult, AppError>> {
    const results = await Promise.allSettled(
      keys.map(key => this.createKey(branchId, key))
    );

    const created = results.filter(r => r.status === 'fulfilled').length;
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({ key: keys[i], reason: r.reason.message }));

    // Partial success is still a success
    return ok({ created, failed });
  }
}
```

### Validation with Multiple Errors

```typescript
export interface ValidationIssue {
  field: string;
  message: string;
}

export class ImportService {
  async validateImport(
    data: ImportData
  ): Promise<Result<ImportData, ValidationIssue[]>> {
    const issues: ValidationIssue[] = [];

    if (!data.keys?.length) {
      issues.push({ field: 'keys', message: 'At least one key required' });
    }

    for (const key of data.keys ?? []) {
      if (!key.name) {
        issues.push({ field: `keys.${key.id}.name`, message: 'Name required' });
      }
    }

    if (issues.length > 0) {
      return err(issues);
    }

    return ok(data);
  }
}
```

### Operations with Warnings

```typescript
export interface MergeResult {
  merged: number;
  warnings: string[];
}

export class BranchService {
  async merge(
    sourceBranchId: string,
    targetBranchId: string
  ): Promise<Result<MergeResult, AppError>> {
    // Check for conflicts first
    const conflicts = await this.checkConflicts(sourceBranchId, targetBranchId);
    if (conflicts.length > 0) {
      return err(new ConflictError('Merge conflicts detected', { conflicts }));
    }

    // Perform merge
    const merged = await this.performMerge(sourceBranchId, targetBranchId);

    // Collect warnings
    const warnings: string[] = [];
    if (merged.skipped > 0) {
      warnings.push(`${merged.skipped} keys skipped (already up to date)`);
    }

    return ok({ merged: merged.count, warnings });
  }
}
```

## Usage in Routes

```typescript
import { isOk, isErr, unwrap } from '../lib/result.js';

fastify.post('/api/translations/bulk', async (request, reply) => {
  const result = await translationService.bulkCreateKeys(
    request.body.branchId,
    request.body.keys
  );

  if (isOk(result)) {
    // Success - return data with appropriate status
    return reply.status(201).send(result.data);
  }

  // Error - handle based on error type
  if (result.error instanceof ConflictError) {
    return reply.status(409).send({
      error: 'Conflict',
      message: result.error.message,
      details: result.error.details,
    });
  }

  // Validation errors
  if (Array.isArray(result.error)) {
    return reply.status(400).send({
      error: 'Validation Failed',
      issues: result.error,
    });
  }

  // Unknown error
  throw result.error;
});
```

## Combining Results

```typescript
/**
 * Combine multiple results - fails if any fail
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    data.push(result.data);
  }

  return ok(data);
}

/**
 * Collect all errors from multiple results
 */
export function collectErrors<T, E>(results: Result<T, E>[]): E[] {
  return results
    .filter((r): r is { ok: false; error: E } => !r.ok)
    .map(r => r.error);
}
```

## Best Practices

1. **Use for complex operations** - Simple CRUD can just throw
2. **Be consistent** - If a service uses Result, all similar methods should
3. **Type the error** - `Result<T, ValidationError>` not just `Result<T>`
4. **Handle in routes** - Don't let Results leak to global error handler
5. **Document when used** - Make it clear in JSDoc
