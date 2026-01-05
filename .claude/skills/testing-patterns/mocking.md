# Mocking Patterns

Techniques for isolating code under test by mocking dependencies.

## Vitest Mocking Basics

### Mock Functions

```typescript
import { vi, describe, it, expect } from 'vitest';

// Create mock function
const mockFn = vi.fn();

// With return value
const mockGetUser = vi.fn().mockReturnValue({ id: '1', name: 'Test' });

// With async return
const mockFetchUser = vi.fn().mockResolvedValue({ id: '1', name: 'Test' });

// With implementation
const mockCalculate = vi.fn((a, b) => a + b);
```

### Verify Calls

```typescript
it('should call handler with correct args', () => {
  const handler = vi.fn();
  processData(data, handler);

  expect(handler).toHaveBeenCalled();
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(data);
  expect(handler).toHaveBeenLastCalledWith(data);
});
```

## Mocking Modules

### Auto Mock

```typescript
import { vi } from 'vitest';

// Mock entire module
vi.mock('@/services/email-service');

import { EmailService } from '@/services/email-service';

it('should send email', async () => {
  const service = new EmailService();
  await service.send('test@example.com', 'Hello');

  expect(service.send).toHaveBeenCalledWith('test@example.com', 'Hello');
});
```

### Manual Mock

```typescript
vi.mock('@/services/email-service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ success: true }),
    verify: vi.fn().mockResolvedValue(true),
  })),
}));
```

### Partial Mock

```typescript
vi.mock('@/utils/helpers', async () => {
  const actual = await vi.importActual('@/utils/helpers');
  return {
    ...actual,
    // Only mock specific function
    sendNotification: vi.fn().mockResolvedValue(true),
  };
});
```

## Mocking Prisma Client

### Using vitest-mock-extended

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Create typed mock
const mockPrisma = mockDeep<PrismaClient>();

// Reset between tests
beforeEach(() => {
  mockReset(mockPrisma);
});

describe('ProjectService', () => {
  it('should find project by id', async () => {
    const mockProject = { id: '1', name: 'Test', slug: 'test' };
    mockPrisma.project.findUnique.mockResolvedValue(mockProject);

    const service = new ProjectService(mockPrisma);
    const result = await service.findById('1');

    expect(result).toEqual(mockProject);
    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });
});
```

### Mock Transactions

```typescript
mockPrisma.$transaction.mockImplementation(async (callback) => {
  return callback(mockPrisma);
});

it('should handle transaction', async () => {
  mockPrisma.project.create.mockResolvedValue({ id: '1' });
  mockPrisma.translationKey.createMany.mockResolvedValue({ count: 5 });

  const result = await service.createProjectWithKeys(data);

  expect(mockPrisma.$transaction).toHaveBeenCalled();
});
```

## Mocking External APIs

### HTTP Clients

```typescript
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
    })),
  },
}));

import axios from 'axios';

it('should fetch from API', async () => {
  vi.mocked(axios.get).mockResolvedValue({
    data: { translations: [] },
  });

  const result = await translationApi.fetch('en');

  expect(axios.get).toHaveBeenCalledWith(
    expect.stringContaining('/translations'),
    expect.any(Object)
  );
});
```

### Fetch API

```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

it('should call external API', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'result' }),
  });

  const result = await service.fetchData();

  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.example.com/data',
    expect.objectContaining({
      method: 'GET',
    })
  );
});
```

## Mocking Time

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should handle time-based logic', () => {
  vi.setSystemTime(new Date('2025-01-01'));

  const result = getRelativeDate(new Date('2024-12-31'));

  expect(result).toBe('yesterday');
});

it('should handle timers', async () => {
  const callback = vi.fn();
  scheduleTask(callback, 1000);

  vi.advanceTimersByTime(1000);

  expect(callback).toHaveBeenCalled();
});
```

## Spying on Methods

```typescript
import { vi } from 'vitest';

it('should spy on method', () => {
  const service = new NotificationService();
  const spy = vi.spyOn(service, 'send');

  service.notify('Hello');

  expect(spy).toHaveBeenCalledWith('Hello');

  spy.mockRestore();
});

it('should spy and mock', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  logError('Something went wrong');

  expect(spy).toHaveBeenCalledWith('Something went wrong');

  spy.mockRestore();
});
```

## Mocking Environment Variables

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

describe('with env vars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use API key from env', async () => {
    process.env.API_KEY = 'test-key';

    const { apiClient } = await import('@/lib/api');

    expect(apiClient.apiKey).toBe('test-key');
  });
});
```

## Factory Pattern for Mocks

```typescript
// tests/helpers/mocks.ts
export function createMockPrisma() {
  return mockDeep<PrismaClient>();
}

export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

export function createMockEmailService() {
  return {
    send: vi.fn().mockResolvedValue({ success: true }),
    verify: vi.fn().mockResolvedValue(true),
    getTemplate: vi.fn().mockReturnValue('<html>...</html>'),
  };
}

// Usage
it('should log and send email', async () => {
  const mockLogger = createMockLogger();
  const mockEmail = createMockEmailService();

  const service = new NotificationService(mockLogger, mockEmail);
  await service.notifyUser(user, 'Welcome!');

  expect(mockLogger.info).toHaveBeenCalled();
  expect(mockEmail.send).toHaveBeenCalled();
});
```

## Best Practices

### Reset Mocks Between Tests

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // Clear call history
  // or
  vi.resetAllMocks(); // Clear + reset implementations
  // or
  vi.restoreAllMocks(); // Restore original implementations
});
```

### Mock at the Right Level

```typescript
// ✅ Good - mock external boundary
vi.mock('@/lib/email-client');

// ❌ Bad - mock internal implementation
vi.mock('@/services/notification/helpers/format-message');
```

### Avoid Over-Mocking

```typescript
// ❌ Bad - mocking everything
vi.mock('@/utils/validation');
vi.mock('@/utils/formatting');
vi.mock('@/utils/helpers');

// ✅ Good - only mock what's necessary
vi.mock('@/lib/external-api');

// Use real validation, formatting - they're pure functions
```

### Type-Safe Mocks

```typescript
import type { EmailService } from '@/services/email';

// ✅ Type-safe mock
const mockEmail: jest.Mocked<EmailService> = {
  send: vi.fn(),
  verify: vi.fn(),
};

// Catches type errors
mockEmail.send.mockResolvedValue({ success: true });
```
