---
name: target-fe-architecture
description: Target frontend architecture for Lingx. FSD 2.1 approach with custom hooks, component patterns, and data fetching. Use when implementing frontend features, reviewing code, or making architectural decisions.
---

# Lingx Frontend Architecture

Target architecture patterns for the Lingx web application. Practical FSD 2.1 approach with gradual migration.

## Quick Reference

```
apps/web/src/
├── app/              # Next.js App Router pages
├── components/       # Shared UI components
│   ├── ui/           # shadcn/ui base components
│   └── ...           # Domain components
├── hooks/            # Custom React hooks
├── lib/              # Utilities & API
└── @lingx/shared  # Shared types (monorepo)
```

## Core Principles

1. **Custom hooks for data** - Extract React Query logic
2. **Co-locate until needed** - Don't split prematurely
3. **Props-down pattern** - Parent fetches, children render
4. **Small components** - Target < 200 lines per file
5. **Shared types** - Use `@lingx/shared` for API contracts

## Documentation

| Document | Purpose |
|----------|---------|
| [hooks.md](hooks.md) | Custom hook patterns |
| [components.md](components.md) | Component splitting rules |
| [data-fetching.md](data-fetching.md) | React Query patterns |
| [state.md](state.md) | State management guidelines |

## When to Apply

- **New features**: Follow patterns in this skill
- **Refactoring**: Apply incrementally to touched code
- **Code review**: Check alignment with these patterns

## Decision Tree

```
Is this a page component with > 200 lines?
  └─ YES → Split into smaller components

Is data fetching repeated across components?
  └─ YES → Extract to custom hook

Is complex logic mixed with rendering?
  └─ YES → Extract to custom hook

Should this component be reused elsewhere?
  └─ YES → Move to components/ folder
  └─ NO → Keep co-located in _components/
```

## FSD Reference

For full Feature-Sliced Design methodology, see the `/fsd` skill.
This skill focuses on practical patterns for Lingx's current structure.
