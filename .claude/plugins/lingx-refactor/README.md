# Lingx Refactor Plugin

Refactor code to follow Lingx architecture patterns with automatic test coverage.

## Features

### Backend Refactoring (CQRS-lite)

- Migrate services to Command/Query/Event patterns
- Organize into domain modules
- Create thin routes dispatching to handlers

### Frontend Refactoring (Progressive FSD)

- Migrate `_components/` to appropriate FSD layers
- Apply layer hierarchy (entities → features → widgets)
- Follow import rules and slice structure

### Test Coverage

- Generate Vitest tests for refactored code
- Ensure refactoring doesn't break existing functionality

## Commands

| Command               | Description                                |
| --------------------- | ------------------------------------------ |
| `/refactor-be [path]` | Refactor backend code to CQRS-lite pattern |
| `/refactor-fe [path]` | Migrate frontend component to FSD layer    |
| `/add-tests [path]`   | Generate test coverage for specified code  |

## Agents

| Agent                   | Trigger              | Purpose                                           |
| ----------------------- | -------------------- | ------------------------------------------------- |
| `architecture-analyzer` | After reading code   | Analyze and suggest refactoring opportunities     |
| `refactoring-agent`     | On refactoring tasks | Perform refactoring following architecture skills |
| `test-coverage-agent`   | After refactoring    | Generate/update tests for refactored code         |

## Skills

This plugin includes architecture skills:

| Skill                    | Purpose                               |
| ------------------------ | ------------------------------------- |
| `target-be-architecture` | CQRS-lite patterns for backend        |
| `target-fe-architecture` | Progressive FSD patterns for frontend |

## Plugin Structure

```
lingx-refactor/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── refactor-be.md
│   ├── refactor-fe.md
│   └── add-tests.md
├── agents/
│   ├── architecture-analyzer.md
│   ├── refactoring-agent.md
│   └── test-coverage-agent.md
├── skills/
│   ├── target-be-architecture/
│   │   ├── SKILL.md
│   │   ├── cqrs-overview.md
│   │   ├── commands.md
│   │   ├── queries.md
│   │   ├── events.md
│   │   └── ...
│   └── target-fe-architecture/
│       ├── SKILL.md
│       ├── fsd-overview.md
│       ├── entities.md
│       ├── features.md
│       ├── widgets.md
│       └── ...
└── README.md
```

## Usage Examples

```bash
# Analyze a service for refactoring opportunities
"Look at apps/api/src/services/translation.service.ts"
# → architecture-analyzer will suggest CQRS refactoring

# Refactor backend to CQRS
/refactor-be apps/api/src/services/user.service.ts

# Migrate frontend component to FSD
/refactor-fe apps/web/src/app/(dashboard)/_components/project-card.tsx

# Add tests for refactored code
/add-tests apps/api/src/modules/translation/commands/update-translation.handler.ts
```

## Architecture Patterns

### Backend (CQRS-lite)

```
modules/[domain]/
├── commands/           # Write operations
│   ├── *.command.ts    # Command classes
│   └── *.handler.ts    # Command handlers
├── queries/            # Read operations
│   ├── *.query.ts      # Query classes
│   └── *.handler.ts    # Query handlers
├── events/             # Side effects
│   └── *.event.ts      # Event classes
└── repository.ts       # Data access
```

### Frontend (Progressive FSD)

```
# Layer hierarchy (top imports bottom)
app/        → widgets, features, entities, shared
widgets/    → features, entities, shared
features/   → entities, shared
entities/   → shared
shared/     → (nothing)
```
