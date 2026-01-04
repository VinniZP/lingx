# DTO Patterns

DTOs (Data Transfer Objects) transform Prisma models into API responses.

## Purpose

1. **Decouple API from database** - API shape can differ from Prisma schema
2. **Control exposed data** - Never leak internal fields
3. **Transform types** - Convert Date to ISO string, etc.
4. **Add computed fields** - Combine data from multiple sources

## Basic Structure

```typescript
// dto/project.dto.ts
import type { Project, Language, MemberRole } from '@prisma/client';
import type { ProjectResponse } from '@lingx/shared';

// Define Prisma result type with includes
export type ProjectWithLanguages = Project & {
  languages: Language[];
};

// DTO function
export function toProjectDto(project: ProjectWithLanguages, myRole: MemberRole): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    myRole: myRole,
    languages: project.languages.map((l) => ({
      code: l.code,
      name: l.name,
    })),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
```

## Common Transformations

### Date to ISO String

```typescript
// Prisma returns Date objects
// API returns ISO strings
createdAt: entity.createdAt.toISOString(),
```

### Nested Objects

```typescript
// Transform nested relations
languages: project.languages.map(lang => ({
  code: lang.code,
  name: lang.name,
  // Don't include internal fields
})),
```

### Computed Fields

```typescript
export function toBranchDto(branch: BranchWithStats, keyCount: number): BranchResponse {
  return {
    id: branch.id,
    name: branch.name,
    // Computed field
    completionRate: keyCount > 0 ? branch.translatedCount / keyCount : 0,
  };
}
```

### Optional Relations

```typescript
export function toKeyDto(key: KeyWithTranslations): KeyResponse {
  return {
    id: key.id,
    name: key.name,
    // Optional nested data
    translations:
      key.translations?.map((t) => ({
        languageCode: t.languageCode,
        value: t.value,
      })) ?? [],
  };
}
```

## File Organization

```
dto/
├── index.ts              # Re-exports all DTOs
├── project.dto.ts        # Project transformations
├── branch.dto.ts         # Branch transformations
├── translation.dto.ts    # Translation transformations
├── user.dto.ts           # User transformations
└── api-key.dto.ts        # API key transformations
```

### Index file

```typescript
// dto/index.ts
export * from './project.dto';
export * from './branch.dto';
export * from './translation.dto';
export * from './user.dto';
export * from './api-key.dto';
```

## Prisma Type Patterns

### Using Prisma.GetPayload

```typescript
import type { Prisma } from '@prisma/client';

// Define type based on includes
export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: {
    languages: true;
    members: {
      include: { user: true };
    };
  };
}>;

// Use in DTO
export function toProjectDto(project: ProjectWithDetails): ProjectResponse {
  // ...
}
```

### Type with Partial Includes

```typescript
// Sometimes relations are optional
export type ProjectMaybeWithLanguages = Project & {
  languages?: Language[];
};

export function toProjectDto(project: ProjectMaybeWithLanguages): ProjectResponse {
  return {
    // ...
    languages: project.languages?.map((l) => l.code) ?? [],
  };
}
```

## Multiple DTOs per Entity

Different endpoints may need different shapes:

```typescript
// Full project for detail view
export function toProjectDto(project: ProjectWithDetails): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    languages: project.languages.map(toLanguageDto),
    members: project.members.map(toMemberDto),
    createdAt: project.createdAt.toISOString(),
  };
}

// Minimal project for lists
export function toProjectListItemDto(project: Project): ProjectListItem {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
  };
}
```

## Anti-patterns

### Don't expose internal IDs

```typescript
// BAD - exposes Prisma internal
return {
  _count: project._count,
};

// GOOD - explicit field
return {
  keyCount: project._count.keys,
};
```

### Don't include sensitive data

```typescript
// BAD - includes password hash
return {
  ...user,
};

// GOOD - explicit safe fields
return {
  id: user.id,
  email: user.email,
  name: user.name,
};
```

### Don't transform in services

```typescript
// BAD - DTO logic in service
class ProjectService {
  async findById(id: string) {
    const project = await this.prisma.project.findUnique({ ... });
    return {
      id: project.id,
      createdAt: project.createdAt.toISOString(), // Wrong layer
    };
  }
}

// GOOD - service returns Prisma model, route uses DTO
class ProjectService {
  async findById(id: string) {
    return this.prisma.project.findUnique({ ... });
  }
}

// In route:
const project = await projectService.findById(id);
return toProjectDto(project);
```

## Best Practices

1. **One DTO file per entity** - Keep related transformations together
2. **Export Prisma types** - Define `EntityWithRelations` types in DTO files
3. **Use response types from @lingx/shared** - Ensure API contract consistency
4. **Handle null/undefined** - Use `?? []` or `?? null` for optional fields
5. **Keep DTOs pure** - No side effects, no async, just transformation
