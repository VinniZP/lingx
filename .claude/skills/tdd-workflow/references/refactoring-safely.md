# Refactoring Safely Under Test Coverage

Guide for refactoring existing code while maintaining test coverage.

## Before Refactoring

### Step 1: Ensure Test Coverage Exists

Before changing any code, verify tests exist:

- Run `pnpm --filter @lingx/api test` to see current test status
- Check for tests in `__tests__/` directories
- Check `tests/integration/` for integration tests

If no tests exist, write characterization tests first.

### Step 2: Write Characterization Tests

Characterization tests capture current behavior (even if buggy):

```typescript
describe('LegacyService (characterization)', () => {
  it('returns current behavior for input X', async () => {
    const result = await service.doSomething(inputX);
    // Assert CURRENT behavior, not desired behavior
    expect(result).toMatchSnapshot();
  });
});
```

Purpose: Detect unintended changes during refactoring.

### Step 3: Run Tests Before Changes

Confirm all tests pass before starting:

```bash
pnpm --filter @lingx/api test
```

If tests fail, fix them first or document known failures.

## During Refactoring

### Rule: Small Steps

Make one change at a time:

1. Extract method
2. Run tests
3. Rename variable
4. Run tests
5. Move code
6. Run tests

Never combine multiple refactoring steps.

### Rule: Tests Must Stay Green

If tests fail after a change:

- Undo the change immediately
- Make a smaller change
- Or fix the test if behavior intentionally changed

### Common Refactoring Patterns

**Extract Method**

Before:

```typescript
async execute(command: Command) {
  // 20 lines of validation
  // 10 lines of processing
}
```

After:

```typescript
async execute(command: Command) {
  this.validate(command);
  return this.process(command);
}

private validate(command: Command) { /* ... */ }
private process(command: Command) { /* ... */ }
```

Run tests after extraction.

**Rename and Move**

1. Rename class/method/variable
2. Run tests
3. Move to new file/location
4. Run tests
5. Update imports
6. Run tests

**Replace Conditional with Polymorphism**

1. Write tests for each branch
2. Extract interface
3. Create implementations for each case
4. Run tests after each step

## Refactoring Legacy Service to CQRS

### Step 1: Identify Operations

Categorize service methods:

- Commands (write operations) → Command handlers
- Queries (read operations) → Query handlers

### Step 2: Add Tests to Legacy Code

Before extracting, ensure the service method has tests:

```typescript
describe('ProjectService.createProject', () => {
  it('creates project with valid input', async () => {
    const result = await service.createProject(input);
    expect(result).toBeDefined();
  });
});
```

### Step 3: Create Handler with Delegation

Create new handler that delegates to existing service:

```typescript
class CreateProjectHandler {
  constructor(private legacyService: ProjectService) {}

  async execute(command: CreateProjectCommand) {
    return this.legacyService.createProject({
      name: command.name,
      slug: command.slug,
    });
  }
}
```

Tests should pass (same behavior).

### Step 4: Move Logic to Handler

Gradually move logic from service to handler:

1. Move one piece of logic
2. Run tests
3. Repeat

### Step 5: Remove Legacy Service

Once handler contains all logic:

1. Update route to use handler directly
2. Remove service method
3. Run tests

## Test Updates During Refactoring

### When to Update Tests

Update tests when:

- Public API changes (method signature, return type)
- Behavior intentionally changes
- Test is testing implementation details

Do not update tests when:

- Internal refactoring only
- Test failure indicates regression

### Updating Test Structure

When moving from service to handler:

Before:

```typescript
describe('ProjectService', () => {
  it('creates project', async () => {
    const result = await service.createProject(input);
  });
});
```

After:

```typescript
describe('CreateProjectHandler', () => {
  it('creates project', async () => {
    const result = await handler.execute(command);
  });
});
```

Keep the same assertions - only change how code is invoked.

## Red Flags During Refactoring

Stop and reassess if:

- Tests keep failing unexpectedly
- Need to change many tests for small refactor
- Unclear what the code should do
- Missing test coverage for critical paths

## Refactoring Checklist

Before:

- [ ] All tests pass
- [ ] Test coverage exists for code being changed
- [ ] Understand current behavior

During:

- [ ] One small change at a time
- [ ] Run tests after each change
- [ ] Undo if tests fail

After:

- [ ] All tests pass
- [ ] No functionality changed (unless intentional)
- [ ] Code follows target architecture patterns
