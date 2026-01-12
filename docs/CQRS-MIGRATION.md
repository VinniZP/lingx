# CQRS-Lite Architecture Migration

> **Updated**: 2026-01-12

This document tracks the migration of API routes from the legacy service-based pattern to the CQRS-lite architecture.

---

## Migration Status

| Symbol | Meaning     |
| ------ | ----------- |
| ✅     | Migrated    |
| 🚧     | In Progress |
| 📋     | Planned     |

---

## Completed Migrations

| #   | Date       | Route                    | Module                 | PR/Commit             |
| --- | ---------- | ------------------------ | ---------------------- | --------------------- |
| 1   | 2026-01-05 | Foundation               | `modules/`             | [#35](../../pulls/35) |
| 2   | 2026-01-05 | `environments.ts`        | `modules/environment/` | `d37a3a6`             |
| 3   | 2026-01-08 | `auth.ts`                | `modules/auth/`        | [#37](../../pulls/37) |
| 4   | 2026-01-08 | `activity.ts`            | `modules/activity/`    | [#38](../../pulls/38) |
| 5   | 2026-01-09 | `security.ts`            | `modules/security/`    | [#39](../../pulls/39) |
| 6   | 2026-01-09 | `totp.ts`, `webauthn.ts` | `modules/mfa/`         | `f93aefd`             |
| 7   | 2026-01-09 | `health.ts`              | `modules/health/`      | [#40](../../pulls/40) |

**Progress**: 9/21 routes migrated (43%) - includes 2 partial migrations

---

## Partial Migrations (Service Relocated, Route Pending)

These services have been moved to their domain modules with repositories, but routes still call services directly. Next step: extract CQRS handlers and thin the route layer.

| #   | Date       | Route                   | Module                        | Status | Remaining Work                       |
| --- | ---------- | ----------------------- | ----------------------------- | ------ | ------------------------------------ |
| 8   | 2026-01-12 | `key-context.ts`        | `modules/key-context/`        | 🚧     | Extract 5 handlers, thin route layer |
| 9   | 2026-01-12 | `quality-estimation.ts` | `modules/quality-estimation/` | 🚧     | Extract 7 handlers, thin route layer |

**What's done:**

- Services relocated from `services/` to `modules/[domain]/`
- New repositories created for data access
- Handler tests added (mocking repositories)
- DI container updated with new paths

**What remains:**

- Routes still call services directly (not via CommandBus/QueryBus)
- Need to create command/query objects for each endpoint
- Need to dispatch through CQRS buses
- Need to make routes thin (validate → authorize → dispatch)

---

## Migration Sequence (Recommended)

The following routes should be migrated in this order, grouped by priority and domain complexity:

### Wave 1: Core Business Logic (High Priority)

| Route             | Complexity | Dependencies       | Notes                                     |
| ----------------- | ---------- | ------------------ | ----------------------------------------- |
| `projects.ts`     | Medium     | None               | Foundation for all project-scoped routes  |
| `branches.ts`     | Medium     | Projects           | Core branching functionality              |
| `translations.ts` | High       | Projects, Branches | Core translation CRUD, largest route file |

### Wave 2: User & Workspace

| Route          | Complexity | Dependencies       | Notes                             |
| -------------- | ---------- | ------------------ | --------------------------------- |
| `profile.ts`   | Low        | Auth               | User profile management           |
| `spaces.ts`    | Low        | None               | Workspace/organization management |
| `dashboard.ts` | Low        | Projects, Activity | Dashboard statistics              |

### Wave 3: Translation Productivity

| Route                    | Complexity | Dependencies | Notes                                          |
| ------------------------ | ---------- | ------------ | ---------------------------------------------- |
| `translation-memory.ts`  | Medium     | Translations | TM matching and suggestions                    |
| `glossary.ts`            | High       | Projects     | Terminology management (largest feature route) |
| `machine-translation.ts` | Medium     | Translations | MT provider integration                        |

### Wave 4: AI & Quality

| Route                   | Complexity | Dependencies           | Notes                                 |
| ----------------------- | ---------- | ---------------------- | ------------------------------------- |
| `ai-translation.ts`     | Medium     | Translations, Glossary | AI-powered translation                |
| `quality-estimation.ts` | Medium     | Translations           | 🚧 Service migrated, handlers pending |
| `key-context.ts`        | Low        | Translations           | 🚧 Service migrated, handlers pending |

### Wave 5: Infrastructure

| Route     | Complexity | Dependencies | Notes                     |
| --------- | ---------- | ------------ | ------------------------- |
| `jobs.ts` | Medium     | Various      | Background job management |
| `sdk.ts`  | Low        | Translations | SDK/CDN endpoints         |

---

## Route Details

### Pending Routes

| Route                    | Lines | Services Used                            | Endpoints                    |
| ------------------------ | ----- | ---------------------------------------- | ---------------------------- |
| `projects.ts`            | ~300  | ProjectService, ActivityService          | CRUD, members, stats         |
| `branches.ts`            | ~350  | BranchService, AccessService             | CRUD, diff, merge            |
| `translations.ts`        | ~900  | TranslationService, MTService, AIService | CRUD, batch, import/export   |
| `dashboard.ts`           | ~40   | DashboardService                         | Stats aggregation            |
| `profile.ts`             | ~200  | UserService, StorageService              | Profile, avatar, preferences |
| `spaces.ts`              | ~240  | SpaceService                             | CRUD, members                |
| `glossary.ts`            | ~800  | GlossaryService                          | CRUD, import/export, sync    |
| `translation-memory.ts`  | ~180  | TMService                                | Search, suggestions          |
| `machine-translation.ts` | ~500  | MTService                                | Translate, providers, usage  |
| `ai-translation.ts`      | ~350  | AITranslationService                     | AI translate, batch          |
| `quality-estimation.ts`  | ~250  | QualityService                           | Evaluate, batch, stats       |
| `key-context.ts`         | ~280  | KeyContextService                        | Context detection            |
| `jobs.ts`                | ~280  | JobService                               | Job management               |
| `sdk.ts`                 | ~200  | TranslationService                       | CDN, bundle                  |

---

## Module Structure

Each migrated domain follows this structure:

```
modules/[domain]/
├── commands/           # Write operations
│   ├── [action].command.ts    # Command definition
│   └── [action].handler.ts    # Command handler
├── queries/            # Read operations
│   ├── [query].query.ts       # Query definition
│   └── [query].handler.ts     # Query handler
├── events/             # Domain events
│   └── [event].event.ts
├── handlers/           # Event handlers (side effects)
│   └── [domain]-activity.handler.ts
├── __tests__/          # Unit tests
├── repository.ts       # Data access (optional)
└── index.ts           # Public API exports
```

---

## Migration Checklist

When migrating a route:

- [ ] Create domain module directory under `modules/`
- [ ] Define commands for write operations
- [ ] Define queries for read operations
- [ ] Define events for side effects
- [ ] Implement handlers with proper dependency injection
- [ ] Update route to be thin (validate → authorize → dispatch)
- [ ] Keep HTTP-specific logic in routes (JWT, cookies, response formatting)
- [ ] Add unit tests for handlers
- [ ] Update this document with completion status
- [ ] Remove unused service methods after migration

---

## References

- `.claude/skills/target-be-architecture/` - Architecture patterns documentation
- `.claude/skills/tdd-workflow/` - TDD workflow for handlers
- `docs/adr/` - Architecture Decision Records
- `apps/api/src/infrastructure/` - CQRS bus implementations
