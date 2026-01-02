---
name: target-be-architecture
description: Target backend architecture for Lingx. DDD-lite patterns with services, result objects, use cases, and error handling. Use when implementing backend features, reviewing code, or making architectural decisions.
---

# Lingx Backend Architecture

Target architecture patterns for the Lingx API server. Simplified DDD approach optimized for our needs.

## Quick Reference

```
apps/api/src/
├── routes/           # HTTP layer (thin)
├── services/         # Business logic (main layer)
├── lib/              # Utilities, Result type
└── errors/           # Error classes
```

## Core Principles

1. **Services are the main layer** - Business logic lives here
2. **Routes are thin** - Only HTTP concerns
3. **Result pattern for writes** - Explicit success/failure
4. **Use cases for complex ops** - Multi-step, cross-service
5. **Errors are typed** - AppError hierarchy

## Documentation

| Document | Purpose |
|----------|---------|
| [services.md](services.md) | Service patterns with Prisma |
| [result-pattern.md](result-pattern.md) | Result<T, E> for operations |
| [use-cases.md](use-cases.md) | When and how to use use cases |
| [error-handling.md](error-handling.md) | Error patterns and hierarchy |

## When to Apply

- **New features**: Follow patterns in this skill
- **Refactoring**: Apply incrementally to touched code
- **Code review**: Check alignment with these patterns

## Decision Tree

```
Is it a simple CRUD operation?
  └─ YES → Service method (return data or throw)

Is it a read-only query?
  └─ YES → Service method (return data or throw)

Is it a write that can partially fail?
  └─ YES → Service method returning Result<T, E>

Does it span multiple services?
  └─ YES → Consider a Use Case

Does it have complex authorization?
  └─ YES → Consider a Use Case
```
