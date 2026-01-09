---
name: tdd-workflow
description: This skill should be used when the user asks to "use TDD", "write tests first", "red-green-refactor", "test-driven development", "TDD for this handler", "create handler with TDD", "implement with tests", or when implementing new CQRS command/query handlers. Provides the Red-Green-Refactor workflow optimized for Lingx's CQRS-lite architecture.
---

# TDD Workflow

Guide Claude through Test-Driven Development for Lingx CQRS handlers.

## When to Use

- Implementing new command or query handlers
- User explicitly requests TDD approach
- Fixing bugs (test proves bug, then proves fix)
- Implementing complex business logic

## TDD Process

### Step 1: Create Test File First

Create the test file before implementation begins:

- Location: `modules/[domain]/[commands|queries]/__tests__/[HandlerName].test.ts`
- Import Vitest: `import { describe, it, expect, vi, beforeEach } from 'vitest'`

### Step 2: Write First Failing Test (RED)

Write a test for the happy path. The test MUST fail when run.

Structure every test with Arrange-Act-Assert:

- Arrange: Set up mocks and input data
- Act: Call the handler
- Assert: Verify expected outcome

Run the test to confirm failure: `pnpm --filter @lingx/api test [path]`

If test passes before implementation exists, the test is wrong.

### Step 3: Minimal Implementation (GREEN)

Write the MINIMUM code to make the test pass:

- Create the handler class
- Implement only what the test requires
- No extra features or optimizations

Run test to confirm it passes.

### Step 4: Add Next Test Case

Add tests incrementally in this order:

1. Happy path (done in Step 2)
2. Validation errors
3. Not found errors
4. Authorization failures
5. Event emission (for commands)
6. Edge cases

For each new test:

- Write test (should fail)
- Implement (should pass)
- Repeat

### Step 5: Refactor (REFACTOR)

With all tests green:

- Remove duplication
- Improve naming
- Extract helper methods
- Apply CQRS patterns from `target-be-architecture`

Run tests after EACH refactoring change.

## Mock Setup Pattern

Use typed mock factories to preserve type safety:

```typescript
const createMockRepository = () => ({
  create: vi.fn(),
  findById: vi.fn(),
});

const createMockEventBus = () => ({
  publish: vi.fn(),
});
```

In `beforeEach`, create fresh mocks and instantiate handler:

```typescript
beforeEach(() => {
  mockRepo = createMockRepository();
  mockEventBus = createMockEventBus();
  handler = new Handler(mockRepo as unknown as RepoType, mockEventBus as unknown as IEventBus);
});
```

Never use `as never` - it bypasses type checking entirely.

## Test Naming

Use pattern: `should [behavior] when [condition]`

Examples:

- `should create project with valid input`
- `should throw NotFoundError when project does not exist`
- `should emit ProjectCreated event after creation`

## Running Tests

- Single file: `pnpm --filter @lingx/api test path/to/Handler.test.ts`
- Watch mode: `pnpm --filter @lingx/api test --watch path/to/Handler.test.ts`
- All unit tests: `pnpm --filter @lingx/api test:unit`

## Decision: TDD vs Test-After

Use TDD for:

- New command/query handlers
- Complex business logic
- Bug fixes
- API contracts

Skip TDD for:

- Simple CRUD operations
- Exploratory spikes (TDD the final solution)
- UI components (use E2E instead)

## Integration with Other Skills

- Handler patterns: See `target-be-architecture`
- Mocking details: See `testing-patterns/mocking.md`
- Integration tests: See `testing-patterns/integration-tests.md`

## Additional Resources

- `references/cqrs-tdd.md` - Detailed CQRS handler TDD examples
- `references/refactoring-safely.md` - Refactoring under test coverage
- `examples/command-handler-tdd.md` - Complete TDD session walkthrough
