---
description: Migrate frontend component to FSD layer (entities/features/widgets)
argument-hint: [component-path]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm:*)
---

Migrate the frontend component at @$ARGUMENTS to the appropriate FSD layer.

## Process

1. **Analyze component**: Read the target component and understand its responsibilities
2. **Load architecture skill**: Use the `target-fe-architecture` skill for patterns
3. **Determine target layer** using decision tree:
   - Pure display of business data → `entities/`
   - User action with mutations → `features/`
   - Complex UI with multiple features + internal state → `widgets/`
   - Generic UI primitive → `shared/ui/`
4. **Present migration plan**: Show source, target, and changes needed
5. **Ask for confirmation**: Wait for user approval before making changes
6. **Execute migration**:
   - Create target directory structure (ui/, model/, lib/)
   - Move/refactor component to target location
   - Extract hooks to `model/` if needed
   - Create `index.ts` public API
   - Update all imports across the codebase
7. **Run typecheck**: Execute `pnpm --filter @lingx/web typecheck` to verify
8. **Suggest test coverage**: If tests are missing, suggest using `/add-tests`

## FSD Layer Decision Tree

```
Is it a simple page-specific component?
  └─ YES → Keep in app/[route]/_components/ (no migration needed)

Is it used across 3+ pages?
  └─ YES → Does it have mutations?
           ├─ YES → features/
           └─ NO → Is it a business object display?
                   ├─ YES → entities/
                   └─ NO → shared/ui/

Does it have complex internal state?
  └─ YES → widgets/

Otherwise → Start in _components/, suggest migration later
```

## Target Structure Examples

### Entity (business object display)

```
entities/project/
├── index.ts              # export { ProjectCard, ProjectListItem }
├── ui/
│   ├── project-card.tsx
│   └── project-list-item.tsx
├── model/
│   └── types.ts
└── lib/
    └── format-project.ts
```

### Feature (user action with mutation)

```
features/delete-project/
├── index.ts              # export { DeleteProjectButton }
├── ui/
│   ├── delete-button.tsx
│   └── confirm-dialog.tsx
└── model/
    └── use-delete-project.ts
```

### Widget (complex UI block)

```
widgets/translation-editor/
├── index.ts
├── ui/
│   ├── translation-editor.tsx
│   ├── key-list.tsx
│   └── presence-bar.tsx
├── model/
│   ├── use-realtime-sync.ts
│   └── editor-context.tsx
└── lib/
    └── conflict-resolver.ts
```

## Important

- Entities cannot have mutations (use action slots for features)
- Features cannot import from widgets (only entities and shared)
- Slices cannot import from sibling slices in the same layer
- Always create `index.ts` to define public API
- Update all imports after moving files
