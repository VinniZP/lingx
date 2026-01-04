---
name: testing-patterns
description: Testing best practices for Lingx. Unit tests with Vitest, integration tests with Prisma, E2E tests with Playwright. Use when writing tests, reviewing test code, or setting up test infrastructure.
---

# Testing Patterns

Best practices for testing in the Lingx codebase using Vitest, Prisma, and Playwright.

## Quick Reference

```bash
# Run tests
pnpm --filter @lingx/api test              # All API tests
pnpm --filter @lingx/api test:unit         # Unit tests only
pnpm --filter @lingx/api test:integration  # Integration tests
pnpm --filter @lingx/web test:e2e          # E2E tests
```

## Test Structure

```
apps/api/tests/
├── unit/                    # Pure function tests, mocked deps
│   ├── services/
│   └── utils/
├── integration/             # Database tests with real Prisma
│   ├── routes/
│   └── services/
└── helpers/                 # Test utilities
    ├── setup.ts
    └── factories.ts

apps/web/tests/
├── e2e/                     # Playwright browser tests
│   ├── fixtures/
│   └── pages/               # Page Object Models
└── playwright.config.ts
```

## Documentation

| Document                                     | Purpose                  |
| -------------------------------------------- | ------------------------ |
| [unit-tests.md](unit-tests.md)               | Unit testing with Vitest |
| [integration-tests.md](integration-tests.md) | Database/API testing     |
| [e2e-tests.md](e2e-tests.md)                 | Playwright E2E testing   |
| [mocking.md](mocking.md)                     | Mocking patterns         |

## Core Principles

### 1. AAA Pattern

Structure every test with **Arrange, Act, Assert**:

```typescript
it('should create project', async () => {
  // Arrange
  const input = { name: 'Test Project', slug: 'test' };

  // Act
  const result = await service.createProject(input);

  // Assert
  expect(result.name).toBe('Test Project');
});
```

### 2. Test Isolation

Each test must be independent:

- No shared mutable state between tests
- Use `beforeEach` to reset state
- Integration tests use transaction rollback

### 3. Descriptive Test Names

```typescript
// ✅ Good - describes behavior
it('should return 404 when project not found', () => {});
it('should reject duplicate slugs', () => {});

// ❌ Bad - vague
it('works', () => {});
it('test project', () => {});
```

### 4. Test User Behavior, Not Implementation

```typescript
// ✅ Good - tests what user sees
expect(response.json().name).toBe('Project');

// ❌ Bad - tests implementation details
expect(service._internalCache.has('key')).toBe(true);
```

## Test Types

### Unit Tests

- Test pure functions and isolated logic
- Mock all external dependencies
- Fast execution (<100ms per test)

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('calculateScore', () => {
  it('should return 100 for perfect translation', () => {
    expect(calculateScore({ matches: 10, total: 10 })).toBe(100);
  });
});
```

### Integration Tests

- Test with real database (transaction-wrapped)
- Test route → service → database flow
- Use Fastify's `inject()` for HTTP tests

```typescript
import { createTestApp } from '../helpers/setup';

describe('POST /projects', () => {
  it('should create project', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Test', slug: 'test' },
    });

    expect(response.statusCode).toBe(201);
  });
});
```

### E2E Tests

- Test complete user flows in browser
- Use Page Object Model for maintainability
- Run against production build

```typescript
import { test, expect } from '@playwright/test';

test('user can create project', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByLabel('Name').fill('My Project');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('My Project')).toBeVisible();
});
```

## Decision Tree

```
What type of test to write?

Is it a pure function with no side effects?
  └─ YES → Unit test (mock dependencies)

Does it interact with database/external services?
  └─ YES → Integration test (real DB, transaction rollback)

Does it test a complete user flow?
  └─ YES → E2E test (Playwright)
```

## Best Practices

### DO

- Keep tests focused on one behavior
- Use factories for test data
- Test error cases, not just happy path
- Run tests in CI on every PR

### DON'T

- Share state between tests
- Test implementation details
- Write flaky tests (retry logic, timing)
- Skip tests without explanation
