---
description: Generate Vitest test coverage for specified code
argument-hint: [file-or-directory-path]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*)
---

Generate comprehensive Vitest test coverage for the code at @$ARGUMENTS.

## Process

1. **Analyze target code**: Read and understand the code to be tested
2. **Identify test type**:
   - Backend command/query handlers → Unit tests with mocked dependencies
   - Backend routes → Integration tests
   - Frontend components → Component tests with React Testing Library
   - Frontend hooks → Hook tests with renderHook
   - Utility functions → Unit tests
3. **Check existing tests**: Look for existing test files in `__tests__/` or `.test.ts`
4. **Present test plan**: Show what tests will be created
5. **Ask for confirmation**: Wait for user approval
6. **Generate tests**: Create comprehensive test files
7. **Run tests**: Execute tests to ensure they pass

## Test Patterns

### Backend Command Handler Test

```typescript
// modules/translation/commands/__tests__/update-translation.handler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateTranslationHandler } from '../update-translation.handler';
import { UpdateTranslationCommand } from '../update-translation.command';

describe('UpdateTranslationHandler', () => {
  let handler: UpdateTranslationHandler;
  let mockRepo: MockTranslationRepository;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockRepo = createMockTranslationRepository();
    mockEventBus = createMockEventBus();
    handler = new UpdateTranslationHandler(mockRepo, mockEventBus);
  });

  it('should update translation and emit event', async () => {
    const cmd = new UpdateTranslationCommand('key-1', 'en', 'Hello', 'user-1');

    const result = await handler.execute(cmd);

    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-1',
        language: 'en',
        value: 'Hello',
      })
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TranslationUpdatedEvent));
  });

  it('should throw if key not found', async () => {
    mockRepo.update.mockRejectedValue(new NotFoundError('Key not found'));

    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundError);
  });
});
```

### Backend Query Handler Test

```typescript
// modules/translation/queries/__tests__/get-translations.handler.test.ts
describe('GetTranslationsHandler', () => {
  it('should return paginated translations', async () => {
    const query = new GetTranslationsQuery('branch-1', { limit: 10 });

    const result = await handler.execute(query);

    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });
});
```

### Frontend Component Test

```typescript
// entities/project/ui/__tests__/project-card.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectCard } from '../project-card';

describe('ProjectCard', () => {
  const mockProject = {
    id: '1',
    name: 'Test Project',
    slug: 'test-project',
  };

  it('should render project name and slug', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('test-project')).toBeInTheDocument();
  });

  it('should render action slot when provided', () => {
    render(
      <ProjectCard
        project={mockProject}
        actions={<button>Delete</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
```

### Frontend Hook Test

```typescript
// features/delete-project/model/__tests__/use-delete-project.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDeleteProject } from '../use-delete-project';
import { QueryClientProvider } from '@tanstack/react-query';

describe('useDeleteProject', () => {
  it('should call delete API and invalidate queries', async () => {
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate('project-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## Test File Location

| Code Type                        | Test Location                                   |
| -------------------------------- | ----------------------------------------------- |
| `modules/[domain]/commands/*.ts` | `modules/[domain]/commands/__tests__/*.test.ts` |
| `modules/[domain]/queries/*.ts`  | `modules/[domain]/queries/__tests__/*.test.ts`  |
| `entities/[name]/ui/*.tsx`       | `entities/[name]/ui/__tests__/*.test.tsx`       |
| `features/[name]/model/*.ts`     | `features/[name]/model/__tests__/*.test.ts`     |

## Important

- Mock external dependencies (database, APIs, event bus)
- Test both success and error cases
- Test edge cases (empty arrays, null values, etc.)
- Use descriptive test names that explain the behavior
- Run tests after generation to verify they pass
