---
description: Scaffold a new frontend page following Lingx FSD patterns
argument-hint: <scope>/<path> (e.g., dashboard/analytics, project/webhooks)
allowed-tools: Read, Write, Edit, Grep, Glob
---

Scaffold a complete frontend page: **$ARGUMENTS**

Use the `target-fe-architecture` skill to ensure all code follows Lingx frontend patterns.

## Step 1: Parse Scope & Path

Determine the route group and page location based on input:

**Supported scopes:**

- `dashboard/<page>` → `apps/web/src/app/(dashboard)/<page>/`
- `project/<page>` → `apps/web/src/app/(project)/projects/[projectId]/<page>/`
- `project/settings/<page>` → `apps/web/src/app/(project)/projects/[projectId]/settings/<page>/`
- `auth/<page>` → `apps/web/src/app/(auth)/<page>/`

Reference existing pages in the target scope for patterns.

## Step 2: Create Page File

File: `apps/web/src/app/(<scope>)/.../<page>/page.tsx`

```tsx
import type { Metadata } from 'next';
import { ${PageName}Content } from './_components/${page-name}-content';

export const metadata: Metadata = {
  title: '${Page Title} | Lingx',
};

interface Props {
  params: Promise<{
    // Dynamic params based on scope
    projectId?: string;
  }>;
}

export default async function ${PageName}Page({ params }: Props) {
  const resolvedParams = await params;

  return <${PageName}Content {...resolvedParams} />;
}
```

## Step 3: Create Content Component

File: `./_components/${page-name}-content.tsx`

```tsx
'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { use${DataHook} } from '../_hooks/use-${data-hook}';
import { ${PageName}Skeleton } from './${page-name}-skeleton';
import { ${PageName}EmptyState } from './${page-name}-empty-state';

interface Props {
  projectId?: string;
}

export function ${PageName}Content({ projectId }: Props) {
  const { t } = useTranslation('${namespace}');
  const { data, isLoading, error } = use${DataHook}(projectId);

  if (isLoading) {
    return <${PageName}Skeleton />;
  }

  if (error) {
    return (
      <div className="text-destructive">
        {t('error.failedToLoad')}
      </div>
    );
  }

  if (!data?.length) {
    return <${PageName}EmptyState />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <Button>
          {t('actions.create')}
        </Button>
      </header>

      {/* Main content */}
      <div className="island">
        {/* Content here */}
      </div>
    </div>
  );
}
```

## Step 4: Create Skeleton Component

File: `./_components/${page-name}-skeleton.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function ${PageName}Skeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-32" />
      </div>

      {/* Content skeleton */}
      <div className="island space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
```

## Step 5: Create Empty State Component

File: `./_components/${page-name}-empty-state.tsx`

```tsx
'use client';

import { useTranslation } from '@lingx/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ${PageName}EmptyState() {
  const { t } = useTranslation('${namespace}');

  return (
    <div className="island flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        {/* Icon */}
      </div>
      <h3 className="text-lg font-medium">{t('empty.title')}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm">
        {t('empty.description')}
      </p>
      <Button className="mt-6">
        <Plus className="size-4 mr-2" />
        {t('actions.create')}
      </Button>
    </div>
  );
}
```

## Step 6: Create Component Index

File: `./_components/index.ts`

```tsx
export { ${PageName}Content } from './${page-name}-content';
export { ${PageName}Skeleton } from './${page-name}-skeleton';
export { ${PageName}EmptyState } from './${page-name}-empty-state';
```

## Step 7: Create Data Hook

File: `./_hooks/use-${data-hook}.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import type { ${DataType}Response, Create${DataType}Input } from '@lingx/shared';

export function use${DataHook}(projectId?: string) {
  return useQuery({
    queryKey: ['${queryKey}', projectId],
    queryFn: async () => {
      const endpoint = projectId
        ? `/api/projects/${projectId}/${endpoint}`
        : '/api/${endpoint}';
      return fetchApi<${DataType}Response[]>(endpoint);
    },
    enabled: !!projectId, // Adjust based on requirements
  });
}

export function useCreate${DataType}(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Create${DataType}Input) => {
      return fetchApi<${DataType}Response>(
        `/api/projects/${projectId}/${endpoint}`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${queryKey}', projectId] });
    },
  });
}

export function useUpdate${DataType}(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Create${DataType}Input> }) => {
      return fetchApi<${DataType}Response>(
        `/api/projects/${projectId}/${endpoint}/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${queryKey}', projectId] });
    },
  });
}

export function useDelete${DataType}(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/api/projects/${projectId}/${endpoint}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${queryKey}', projectId] });
    },
  });
}
```

## Step 8: Create Hook Index

File: `./_hooks/index.ts`

```tsx
export * from './use-${data-hook}';
```

## Step 9: Add Translation Keys

File: `apps/web/public/locales/en/${namespace}.json`

```json
{
  "title": "${Page Title}",
  "description": "${Page description text}",
  "actions": {
    "create": "Create ${Item}",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save changes"
  },
  "empty": {
    "title": "No ${items} yet",
    "description": "Get started by creating your first ${item}."
  },
  "error": {
    "failedToLoad": "Failed to load ${items}"
  },
  "form": {
    "name": "Name",
    "namePlaceholder": "Enter ${item} name"
  }
}
```

Also add to other locales (de.json, etc.) if they exist.

## Step 10: Summary

After scaffolding, provide:

1. List of all created files
2. The page URL path
3. Required API endpoints (if they don't exist)
4. Translation keys added
5. Navigation updates needed (if adding to sidebar)
