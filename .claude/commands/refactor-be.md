---
description: Refactor backend code to CQRS-lite pattern (services → commands/queries/events)
argument-hint: [file-or-directory-path] [additional-notes]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*)
---

Refactor the backend code at @$0 to follow CQRS-lite architecture patterns.

## Process

1. **Analyze current code**: Read the target file/directory and understand its structure
2. **Load architecture skill**: Use the `target-be-architecture` skill for patterns
3. **Identify refactoring opportunities**:
   - Services with mixed read/write operations → Split into Commands and Queries
   - Direct database calls in routes → Extract to handlers
   - Side effects (emails, webhooks, real-time) → Create Events
4. **Present refactoring plan**: Show what will be created/modified
5. **Ask for confirmation**: Wait for user approval before making changes
6. **Execute refactoring**:
   - Create command handlers in `modules/[domain]/commands/`
   - Create query handlers in `modules/[domain]/queries/`
   - Create events in `modules/[domain]/events/`
   - Update routes to dispatch to CommandBus/QueryBus
   - Register handlers in dependency injection
7. **Run tests**: Execute `pnpm --filter @lingx/api test` to verify changes
8. **Suggest test coverage**: If tests are missing, suggest using `/add-tests`

## CQRS-lite Patterns to Apply

### Command Pattern

```typescript
// commands/update-translation.command.ts
export class UpdateTranslationCommand {
  constructor(
    public readonly keyId: string,
    public readonly language: string,
    public readonly value: string,
    public readonly userId: string
  ) {}
}

// commands/update-translation.handler.ts
@CommandHandler(UpdateTranslationCommand)
export class UpdateTranslationHandler {
  async execute(cmd: UpdateTranslationCommand): Promise<Translation> {
    // Validate, update, emit event
  }
}
```

### Query Pattern

```typescript
// queries/get-translations.query.ts
export class GetTranslationsQuery {
  constructor(
    public readonly branchId: string,
    public readonly filters: TranslationFilters
  ) {}
}
```

### Event Pattern

```typescript
// events/translation-updated.event.ts
export class TranslationUpdatedEvent {
  constructor(
    public readonly translation: Translation,
    public readonly userId: string
  ) {}
}
```

## Important

- Do not maintain backward compatibility where possible
- Update all imports after moving files
- Keep routes thin - they should only validate, authorize, dispatch
- Register new handlers in the DI container

### TDD for CQRS Handlers

When creating new command/query handlers, follow TDD:

1. **Write test first** in `modules/[domain]/__tests__/[handler].test.ts`
2. **Run test** - verify it fails (RED)
3. **Implement handler** - minimal code to pass
4. **Run test** - verify it passes (GREEN)
5. **Refactor** if needed

After refactoring create integration tests for happy path

Additional notes:

$ARGUMENTS
