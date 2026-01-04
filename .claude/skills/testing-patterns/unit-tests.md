# Unit Testing with Vitest

Unit tests verify isolated pieces of logic with mocked dependencies.

## Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

## Basic Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = {
        /* test data */
      };

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

## Testing Pure Functions

```typescript
// src/utils/slug.ts
export function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// tests/unit/utils/slug.test.ts
import { describe, it, expect } from 'vitest';
import { generateSlug } from '@/utils/slug';

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('my project name')).toBe('my-project-name');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('should handle multiple spaces', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
  });
});
```

## Testing Services with Dependencies

```typescript
// src/services/project-service.ts
export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async findBySlug(slug: string) {
    return this.prisma.project.findUnique({ where: { slug } });
  }
}

// tests/unit/services/project-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from '@/services/project-service';
import { mockDeep } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockPrisma: ReturnType<typeof mockDeep<PrismaClient>>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ProjectService(mockPrisma);
  });

  describe('findBySlug', () => {
    it('should return project when found', async () => {
      const mockProject = { id: '1', slug: 'test', name: 'Test' };
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findBySlug('test');

      expect(result).toEqual(mockProject);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

## Testing Async Functions

```typescript
describe('async operations', () => {
  it('should resolve with data', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  it('should reject with error', async () => {
    await expect(fetchInvalidData()).rejects.toThrow('Not found');
  });

  it('should handle promise resolution', async () => {
    await expect(Promise.resolve(42)).resolves.toBe(42);
  });
});
```

## Testing Error Cases

```typescript
describe('error handling', () => {
  it('should throw on invalid input', () => {
    expect(() => validateInput(null)).toThrow('Input required');
  });

  it('should throw specific error type', () => {
    expect(() => validateInput(null)).toThrow(ValidationError);
  });

  it('should include error details', () => {
    try {
      validateInput({ name: '' });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.field).toBe('name');
    }
  });
});
```

## Parameterized Tests

```typescript
describe('validation', () => {
  it.each([
    ['valid@email.com', true],
    ['invalid-email', false],
    ['', false],
    ['user@domain', false],
  ])('isValidEmail(%s) should return %s', (email, expected) => {
    expect(isValidEmail(email)).toBe(expected);
  });
});

// With objects
describe.each([
  { input: 0, expected: 'zero' },
  { input: 1, expected: 'one' },
  { input: 2, expected: 'other' },
])('numberToWord($input)', ({ input, expected }) => {
  it(`should return "${expected}"`, () => {
    expect(numberToWord(input)).toBe(expected);
  });
});
```

## Test Helpers

```typescript
// tests/helpers/factories.ts
export function createProject(overrides?: Partial<Project>): Project {
  return {
    id: 'test-id',
    name: 'Test Project',
    slug: 'test-project',
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage
it('should update project name', () => {
  const project = createProject({ name: 'Original' });
  const updated = updateProject(project, { name: 'Updated' });
  expect(updated.name).toBe('Updated');
});
```

## Coverage Goals

- Aim for 80%+ coverage on business logic
- 100% coverage on utility functions
- Don't chase coverage for coverage's sake
- Focus on testing behavior, not lines

```bash
# Run with coverage
pnpm test -- --coverage

# Coverage thresholds in vitest.config.ts
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
  },
}
```

## Anti-Patterns

### Don't Test Implementation

```typescript
// ❌ Bad - tests internal state
it('should add to cache', () => {
  service.getData('key');
  expect(service._cache.has('key')).toBe(true);
});

// ✅ Good - tests behavior
it('should return cached data on second call', () => {
  const first = service.getData('key');
  const second = service.getData('key');
  expect(second).toBe(first);
});
```

### Don't Share Mutable State

```typescript
// ❌ Bad - shared state
const service = new Service();

it('test 1', () => {
  service.add(1);
  expect(service.count).toBe(1);
});

it('test 2', () => {
  // Fails because count is 1 from previous test
  expect(service.count).toBe(0);
});

// ✅ Good - fresh instance
let service: Service;

beforeEach(() => {
  service = new Service();
});
```

### Don't Write Flaky Tests

```typescript
// ❌ Bad - timing dependent
it('should complete in time', async () => {
  const start = Date.now();
  await slowOperation();
  expect(Date.now() - start).toBeLessThan(100);
});

// ✅ Good - test the result, not timing
it('should complete successfully', async () => {
  const result = await slowOperation();
  expect(result.success).toBe(true);
});
```
